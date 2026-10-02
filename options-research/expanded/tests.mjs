import {assert,prices} from "../core.mjs";
import {UNIVERSE,targets,rsiSeries,monthly,portfolio,choose,adjustedOHLC} from "./portfolio.mjs";
function near(a,b){assert(Math.abs(a-b)<1e-7,"Expected "+a+" ~ "+b);}
function fail(fn,re){let e;try{fn();}catch(x){e=x;}assert(e && re.test(e.message),"Expected "+re);}
export function runPortfolioTests(){
 let count=0;
 const test=(name,f)=>{f();count++;};
 const iso=i=>new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10);
 const mk=fn=>prices(UNIVERSE.flatMap((symbol,si)=>Array.from({length:340},(_,i)=>{
  const p=fn(i,si);
  return {date:iso(i),symbol,open:p,close:p,high:p+1,low:p-1};
 })));
 test("RSI flat/up/down",()=>{
  const rs=x=>rsiSeries(x.map(close=>({close}))).at(-1);
  near(rs([100,100,100,100]),50);near(rs([100,101,102,103]),100);near(rs([103,102,101,100]),0);
 });
 test("signals exclude today's close",()=>{
  const a=mk(i=>100+i/10),b=mk(i=>i>=260 ? 1000+i : 100+i/10);
  const index=new Map(UNIVERSE.map(s=>[s,260]));
  const indicators=x=>new Map([...x].map(([s,h])=>[s,rsiSeries(h)]));
  for(const s of [{kind:"trend",symbol:"SPY",lookback:200},{kind:"rotation",lookback:126,skip:0},
    {kind:"rsi",symbol:"SPY",threshold:10}])
   assert(JSON.stringify(targets(a,index,indicators(a),s,{held:false,age:0}))===
    JSON.stringify(targets(b,index,indicators(b),s,{held:false,age:0})),"Future leaked");
 });
 test("round-trip cost and terminal ledger",()=>{
  const r=portfolio(mk(()=>100),{kind:"passive",symbol:"SPY"},{start:iso(260),end:iso(270),bps:5});
  near(r.metrics.final,10000/1.0005*0.9995);
  assert(r.fills.length===2 && r.trades.length===1,"One round-trip");
  assert(r.fills[0].date===iso(260) && r.fills[1].date===iso(270),"Dates");
 });
 test("future change does not affect earlier equity",()=>{
  const a=mk(i=>100+i/10),b=mk(i=>i>=300 ? 150+i/10 : 100+i/10);
  const s={kind:"trend",symbol:"SPY",lookback:200},cfg={start:iso(260),end:iso(320)};
  const ea=portfolio(a,s,cfg).equity.filter(e=>e.date<iso(300));
  const eb=portfolio(b,s,cfg).equity.filter(e=>e.date<iso(300));
  assert(JSON.stringify(ea)===JSON.stringify(eb),"Future equity leak");
 });
 test("empty momentum portfolio stays cash",()=>{
  const d=mk(i=>200-i/10),r=portfolio(d,{kind:"rotation",lookback:63,skip:0},{start:iso(260),end:iso(320)});
  near(r.metrics.final,10000);assert(r.fills.length===0,"No trades");
 });
 test("missing synchronized price fails",()=>{
  const d=mk(()=>100);d.set("TLT",d.get("TLT").filter(r=>r.date!==iso(270)));
  fail(()=>portfolio(d,{kind:"passive",symbol:"SPY"},{start:iso(260),end:iso(280)}),/Missing synchronized/);
 });
 test("double costs reduce passive returns",()=>{
  const d=mk(i=>100+i/10),s={kind:"passive",symbol:"SPY"},cfg={start:iso(260),end:iso(320)};
  assert(portfolio(d,s,{...cfg,bps:10}).metrics.final<portfolio(d,s,{...cfg,bps:5}).metrics.final,"Stress");
 });
 test("monthly target uses full months only",()=>{
  const eq=[["2020-01-10",110],["2020-02-28",121],["2020-03-31",133.1],["2020-04-15",146.41]]
   .map(([date,value])=>({date,value}));
  const m=monthly(eq,100);near(m.geometricAverage,0.1);near(m.atLeast6Percent,1);
  assert(m.fullMonths===2 && !m.targetAchieved,"Too short for target claim");
 });
 test("selection cannot use test result",()=>{
  const row=(name,cagr)=>({strategy:{name},training:{metrics:{return:0.1}},
   validation:{metrics:{return:0.2,maxDrawdown:0.1,tradingEvents:20,cagr}}});
  const a=row("a",0.1),b=row("b",0.2);
  assert(choose([a,b]).strategy.name==="b","Select validation winner");
  a.test={return:100};b.test={return:-100};
  assert(choose([a,b]).strategy.name==="b","Test cannot change winner");
 });
 test("signal executes on subsequent open",()=>{
  const d=mk(()=>100),spy=d.get("SPY");
  spy[261]={...spy[261],close:120,high:121};
  spy[262]={...spy[262],open:130,close:120,high:131};
  const r=portfolio(d,{kind:"trend",symbol:"SPY",lookback:200},{start:iso(261),end:iso(265),bps:0});
  assert(r.fills[0].date===iso(262),"Delayed open");
  near(r.fills[0].price,130);
 });
 test("position allocations cannot borrow",()=>{
  const d=mk((i,s)=>100+i*(s+1)/100),r=portfolio(d,{kind:"rotation",lookback:63,skip:0},
   {start:iso(260),end:iso(330)});
  assert(r.equity.every(e=>Number.isFinite(e.value) && e.value>0),"Finite equity");
  assert(r.fills.every(f=>f.quantity>0),"Positive quantities");
 });
 test("adjustment preserves equal OHLC bounds",()=>{
  const p=adjustedOHLC({open:82.19,high:82.30,low:82.10,close:82.30},53.6724853515625);
  near(p.high,p.close);
  prices([{date:iso(0),symbol:"SPY",...p}]);
  near(p.close,53.6724853515625);
 });
 return count;
}
