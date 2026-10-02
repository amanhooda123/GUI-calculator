import {assert,date,DAY,stats} from "../core.mjs";
export const UNIVERSE=["SPY","QQQ","IWM","TLT","GLD","SHY"];
export const PERIODS={
 train:{start:"2007-01-01",end:"2012-12-31"},
 validation:{start:"2013-01-01",end:"2018-12-31"},
 test:{start:"2019-01-01",end:"2024-10-01"}
};
export const CANDIDATES=[
 {name:"SPY-trend-200",kind:"trend",symbol:"SPY",lookback:200},
 {name:"QQQ-trend-200",kind:"trend",symbol:"QQQ",lookback:200},
 {name:"SPY-trend-50",kind:"trend",symbol:"SPY",lookback:50},
 {name:"SPY-RSI2-5",kind:"rsi",symbol:"SPY",threshold:5},
 {name:"SPY-RSI2-10",kind:"rsi",symbol:"SPY",threshold:10},
 {name:"rotation-63",kind:"rotation",lookback:63,skip:0},
 {name:"rotation-126",kind:"rotation",lookback:126,skip:0},
 {name:"rotation-252-skip21",kind:"rotation",lookback:252,skip:21},
 {name:"dual-momentum-126",kind:"dual",lookback:126}
];
export function sma(a,i,n) {
 assert(i>=n,"Insufficient SMA warmup");
 return a.slice(i-n,i).reduce((s,p)=>s+p.close,0)/n;
}
export function rsiSeries(a,n=2) {
 const result=Array(a.length).fill(null);
 let gain=0,loss=0;
 for(let i=1;i<a.length;i++){
  const delta=a[i].close-a[i-1].close,g=Math.max(0,delta),l=Math.max(0,-delta);
  if(i<=n) {gain+=g/n;loss+=l/n;}
  else {gain=(gain*(n-1)+g)/n;loss=(loss*(n-1)+l)/n;}
  if(i>=n)result[i]=gain+loss===0 ? 50 : loss===0 ? 100 : 100-100/(1+gain/loss);
 }
 return result;
}
export function targets(data,indices,indicators,strategy,state) {
 const s=strategy;
 if(s.kind==="passive")return {[s.symbol]:1};
 if(s.kind==="balanced")return {SPY:0.6,TLT:0.4};
 if(s.kind==="trend"){
  const a=data.get(s.symbol),i=indices.get(s.symbol);
  if(i<s.lookback)return {};
  return a[i-1].close>sma(a,i,s.lookback) ? {[s.symbol]:1} : {};
 }
 if(s.kind==="rsi"){
  const a=data.get(s.symbol),i=indices.get(s.symbol);
  if(i<200)return {};
  const r=indicators.get(s.symbol)[i-1];
  if(state.held)return r>=50 || state.age>=10 ? {} : {[s.symbol]:1};
  return a[i-1].close>sma(a,i,200) && r<=s.threshold ? {[s.symbol]:1} : {};
 }
 const candidates=(s.kind==="dual" ? ["SPY","QQQ"] : ["SPY","QQQ","IWM","TLT","GLD"])
  .map(symbol=>{
   const a=data.get(symbol),i=indices.get(symbol),end=i-1-(s.skip ?? 0),begin=i-1-s.lookback;
   return {symbol,momentum:begin<0 ? -Infinity : a[end].close/a[begin].close-1};
  }).filter(c=>c.momentum>0).sort((a,b)=>b.momentum-a.momentum || a.symbol.localeCompare(b.symbol));
 if(s.kind==="dual")return candidates.length ? {[candidates[0].symbol]:1} : {SHY:1};
 const top=candidates.slice(0,2);
 // Each available winner gets 50%; absent winners leave that sleeve in cash.
 return Object.fromEntries(top.map(c=>[c.symbol,0.5]));
}
export function monthly(equity,initial) {
 const byMonth=new Map();
 for(const e of equity)byMonth.set(e.date.slice(0,7),e.value);
 let previous=initial;
 const all=[...byMonth].map(([month,value])=>{const r={month,return:value/previous-1};previous=value;return r;});
 const full=all.slice(1,-1); // Conservatively exclude both endpoint months.
 const product=full.reduce((p,m)=>p*(1+m.return),1);
 return {all,fullMonths:full.length,geometricAverage:full.length ? product**(1/full.length)-1 : null,
   winningFraction:full.length ? full.filter(m=>m.return>0).length/full.length : null,
   atLeast6Percent:full.length ? full.filter(m=>m.return>=0.06).length/full.length : null,
   atLeast7Percent:full.length ? full.filter(m=>m.return>=0.07).length/full.length : null,
   worst:full.length ? Math.min(...full.map(m=>m.return)) : null,
   best:full.length ? Math.max(...full.map(m=>m.return)) : null,
   targetAchieved:full.length>=24 && product**(1/full.length)-1>=0.06};
}
export function portfolio(data,strategy,settings) {
 const cfg={capital:10000,bps:5,...settings};
 assert(Number.isFinite(cfg.capital) && cfg.capital>0 && cfg.bps>=0 && cfg.bps<100,"Invalid portfolio settings");
 for(const symbol of UNIVERSE)assert(data.has(symbol),"Missing universe symbol "+symbol);
 const all=data.get("SPY").map(p=>p.date);
 const maps=new Map([...data].map(([s,a])=>[s,new Map(a.map((p,i)=>[p.date,i]))]));
 const dates=all.filter(d=>d>=cfg.start && d<=cfg.end);
 assert(dates.length>=2,"Empty portfolio period");
 for(const d of dates)for(const symbol of UNIVERSE)
  assert(maps.get(symbol).has(d),"Missing synchronized session "+symbol+" "+d);
 const indicators=new Map([...data].map(([s,a])=>[s,rsiSeries(a)]));
 const positions=new Map(),equity=[],trades=[],fills=[];
 let cash=cfg.capital,age=0,key=null,previousMonth=null;
 const bps=cfg.bps/10000;
 function sell(symbol,quantity,p,d,reason) {
  const pos=positions.get(symbol),fraction=quantity/pos.units;
  const basis=pos.basis*fraction,proceeds=quantity*p*(1-bps);
  cash+=proceeds;pos.basis-=basis;pos.units-=quantity;
  trades.push({symbol,entryDate:pos.entryDate,exitDate:d,quantity,pnl:proceeds-basis,reason});
  fills.push({date:d,symbol,side:"sell",quantity,price:p*(1-bps),cost:quantity*p*bps});
  if(pos.units<1e-10)positions.delete(symbol);
 }
 for(let k=0;k<dates.length;k++){
  const d=dates[k],month=d.slice(0,7),last=k===dates.length-1;
  const indices=new Map(UNIVERSE.map(s=>[s,maps.get(s).get(d)]));
  const open=s=>data.get(s)[indices.get(s)].open;
  if(positions.size)age++;else age=0;
  const target=targets(data,indices,indicators,strategy,{held:positions.size>0,age});
  const newKey=JSON.stringify(Object.entries(target).sort());
  const monthlyRebalance=["rotation","dual","balanced"].includes(strategy.kind);
  const rebalance=k===0 || (monthlyRebalance ? month!==previousMonth : newKey!==key);
  if(rebalance && !last) {
   const sum=Object.values(target).reduce((a,b)=>a+b,0);
   assert(sum<=1+1e-10 && Object.values(target).every(w=>w>=0),"Leveraged allocation forbidden");
   const nav=cash+[...positions].reduce((v,[s,p])=>v+p.units*open(s),0);
   const desired=new Map(UNIVERSE.map(s=>[s,(target[s] ?? 0)*nav/open(s)]));
   for(const [s,pos] of [...positions]){
    const q=Math.max(0,pos.units-desired.get(s));
    if(q*open(s)>1e-7)sell(s,q,open(s),d,"rebalance");
   }
   const buys=UNIVERSE.map(s=>({s,q:Math.max(0,desired.get(s)-(positions.get(s)?.units ?? 0))}));
   const demand=buys.reduce((v,b)=>v+b.q*open(b.s)*(1+bps),0);
   const scale=demand ? Math.min(1,Math.max(0,cash)/demand) : 0;
   for(const b of buys){
    const quantity=b.q*scale,cost=quantity*open(b.s)*(1+bps);
    if(cost<=1e-7)continue;
    cash-=cost;
    const pos=positions.get(b.s) ?? {units:0,basis:0,entryDate:d};
    pos.units+=quantity;pos.basis+=cost;positions.set(b.s,pos);
    fills.push({date:d,symbol:b.s,side:"buy",quantity,price:open(b.s)*(1+bps),cost:quantity*open(b.s)*bps});
   }
   assert(cash>=-1e-7,"Cash overspent");
   cash=Math.max(0,cash);key=newKey;
  }
  if(last)for(const [s,pos] of [...positions])
   sell(s,pos.units,data.get(s)[indices.get(s)].close,d,"terminal");
  const value=cash+[...positions].reduce((v,[s,p])=>v+p.units*data.get(s)[indices.get(s)].close,0);
  equity.push({date:d,value});
  previousMonth=month;
 }
 const metrics={...stats(equity,trades,cfg.capital),tradingEvents:fills.length,modeledTradingCosts:fills.reduce((s,f)=>s+f.cost,0)};
 return {strategy,settings:cfg,metrics,monthly:monthly(equity,cfg.capital),equity,trades,fills};
}
export function choose(rows) {
 return rows.filter(r=>r.training.metrics.return>0 && r.validation.metrics.return>0 &&
   r.validation.metrics.maxDrawdown<=0.25 && r.validation.metrics.tradingEvents>=12)
  .sort((a,b)=>(b.validation.metrics.cagr-0.5*b.validation.metrics.maxDrawdown)-
   (a.validation.metrics.cagr-0.5*a.validation.metrics.maxDrawdown) ||
   a.strategy.name.localeCompare(b.strategy.name))[0] ?? null;
}
export function experiment(data) {
 const evaluated=CANDIDATES.map(strategy=>{
  const training=portfolio(data,strategy,PERIODS.train),validation=portfolio(data,strategy,PERIODS.validation);
  return {strategy,training:{metrics:training.metrics,monthly:training.monthly},
    validation:{metrics:validation.metrics,monthly:validation.monthly}};
 });
 const winner=choose(evaluated);
 // Winner is frozen without ever receiving test metrics.
 const selected=winner?.strategy ?? null;
 const test=selected ? portfolio(data,selected,PERIODS.test) : null;
 const stress=selected ? portfolio(data,selected,{...PERIODS.test,bps:10}) : null;
 const benchmarks=[
 {name:"SPY-buy-hold",kind:"passive",symbol:"SPY"},
 {name:"QQQ-buy-hold",kind:"passive",symbol:"QQQ"},
 {name:"SPY-TLT-60-40",kind:"balanced"}
 ].map(s=>portfolio(data,s,PERIODS.test));
 let decision="CASH: no candidate qualified before test";
 if(test)decision=test.metrics.return<=0 || stress.metrics.return<=0 ? "REJECT: failed positive test or cost stress" :
  test.metrics.maxDrawdown>0.25 ? "REJECT: test drawdown exceeded 25%" :
  test.monthly.targetAchieved && stress.monthly.targetAchieved ? "HISTORICAL TARGET MET: forward validation still required" :
  "HISTORICALLY POSITIVE: 6-7% monthly target not established";
 const annual=[];
 if(test) {
  let initial=test.settings.capital;
  const years=new Map();
  for(const e of test.equity)years.set(e.date.slice(0,4),e.value);
  for(const [year,value] of years){annual.push({year,return:value/initial-1});initial=value;}
 }
 return {asset:"ETF total-return adjusted-OHLC proxy",periods:PERIODS,candidateCount:CANDIDATES.length,
  candidates:evaluated,selected,test,stress,benchmarks,annual,decision,
  target:{monthlyMinimum:0.06,monthlyUpper:0.07,minimumMonths:24,measurement:"Geometric mean of full months; both base and double-cost tests"},
  limitations:["Retrospective historical test, not forward paper trading or future-profit evidence",
   "Fractional adjusted units approximate dividend reinvestment and corporate actions; no exact brokerage fills",
   "No historical option quotes or option profit claims","USD, no FX/taxes/interest, no leverage",
   "Today's fixed ETF universe creates selection bias","Only one frozen winner tested; do not tune after opening results"]};
}

export function adjustedOHLC(row,adjustedClose) {
 assert(row.close>0 && adjustedClose>0,"Invalid adjustment inputs");
 const ratio=adjustedClose/row.close;
 // Apply the same operation to every field. Mixing exact adjusted close with
 // multiplied OHLC can violate equal high/close bounds by one floating-point ULP.
 return Object.fromEntries(["open","high","low","close"].map(k=>[k,row[k]*ratio]));
}
