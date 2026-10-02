import {assert, prices,quotes,backtest,signal,csv,select,date,research} from "./core.mjs";
function throws(fn, pattern) {
  let error; try { fn(); } catch(e) { error=e; }
  assert(error && pattern.test(error.message), "Expected error " + pattern);
}
function near(a,b) { assert(Math.abs(a-b)<1e-7,"Expected "+a+" = "+b); }
export function runTests() {
  let count=0;
  const test=(name,fn)=>{fn();count++;};
  const iso=i=>new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);
  const rows=Array.from({length:120},(_,i)=>({date:iso(i),symbol:"SPY",open:100+i,high:102+i,low:99+i,close:101+i}));
  const p=prices(rows), trend={name:"test",kind:"trend",lookback:20,option:true,minDTE:7,maxDTE:45,target:0.25,stop:0.3,maxHold:20};
  const qr=(i,bid,ask)=>({date:iso(i),symbol:"SPY",contract:"SPY-C",expiration:iso(60),
    type:"call",strike:125,bid,ask,open_interest:200,multiplier:100});
  test("calendar validation",()=>throws(()=>date("2024-02-30"),/calendar/));
  test("CSV columns",()=>throws(()=>csv("a,b\n1"),/row/));
  test("duplicate prices",()=>throws(()=>prices([rows[0],rows[0]]),/Duplicate/));
  test("invalid OHLC",()=>throws(()=>prices([{...rows[0],high:1}]),/OHLC/));
  test("non-finite quote",()=>throws(()=>quotes([{...qr(25,1,1.1),bid:"NaN"}]),/bid/));
  test("contract identity",()=>throws(()=>quotes([qr(25,1,1.1),{...qr(26,1,1.1),strike:130}]),/metadata/));
  test("future price cannot change past signal",()=>{
    const a=p.get("SPY"),b=a.map((r,i)=>i>=25 ? {...r,close:1000000} : r);
    near(signal(a,25,trend),signal(b,25,trend));
  });
  test("fill at ask, sell at bid with fees",()=>{
    const q=quotes([qr(25,1,1.1),qr(26,1.5,1.6),qr(27,1.5,1.6)]);
    const r=backtest({prices:p,quotes:q},trend,{start:iso(25),end:iso(27),slip:0});
    assert(r.trades.length===1,"Trade count");
    near(r.trades[0].pnl,38.7);near(r.metrics.final,10038.7);
    near(r.trades[0].entry,1.1);near(r.trades[0].exit,1.5);
  });
  test("missing quote aborts instead of invented mark",()=>{
    throws(()=>backtest({prices:p,quotes:quotes([qr(25,1,1.1)])},trend,
      {start:iso(25),end:iso(27)}),/Missing option quote/);
  });
  test("risk budget skips expensive contract",()=>{
    const r=backtest({prices:p,quotes:quotes([qr(25,5,5.1)])},trend,{start:iso(25),end:iso(27)});
    near(r.metrics.final,10000);near(r.trades.length,0);
  });
  test("a gap can lose more than stop",()=>{
    const r=backtest({prices:p,quotes:quotes([qr(25,1,1.1),qr(26,0,0.1),qr(27,0,0.1)])},
      trend,{start:iso(25),end:iso(27),slip:0});
    near(r.trades[0].pnl,-111.3);
  });
  test("terminal liquidation fees",()=>{
    const r=backtest({prices:p,quotes:quotes([qr(25,1,1.1),qr(26,1.1,1.2)])},
      trend,{start:iso(25),end:iso(26),slip:0});
    near(r.trades[0].pnl,-1.3);assert(r.trades[0].reason==="end","Terminal close");
  });
  test("stock exits use next open",()=>{
    const a=rows.map(r=>({...r}));
    a[26]={...a[26],open:120,high:128,low:1,close:1};
    a[27]={...a[27],open:110,low:109,high:129,close:128};
    const r=backtest({prices:prices(a)},{...trend,option:false},
      {start:iso(25),end:iso(28),stockBps:0});
    near(r.trades[0].entry,125);near(r.trades[0].exit,110);
    assert(r.trades[0].exitDate===iso(27),"Signal must be delayed");
  });
  test("no qualifying strategy returns cash",()=>assert(select([])===null,"Cash"));
  test("training score excludes negative or low samples",()=>assert(select([
    {metrics:{trades:100,return:-0.1,maxDrawdown:0.1}},
    {metrics:{trades:2,return:5,maxDrawdown:0.01}}])===null,"Selection gate"));
  test("short dataset cannot claim research",()=>throws(()=>research({prices:p}),/300/));
  test("holdout changes cannot alter training selection",()=>{
    const rr=Array.from({length:450},(_,i)=>{
      const c=100+i*0.02+Math.sin(i/8)*7;
      return {date:iso(i),symbol:"SPY",open:c,close:c,high:c+1,low:c-1};
    });
    const changed=rr.map((r,i)=>i>=324 ? {...r,open:r.open*2,close:r.close*2,high:r.high*2,low:r.low*2} : r);
    const a=research({prices:prices(rr)}),b=research({prices:prices(changed)});
    assert(JSON.stringify(a.training)===JSON.stringify(b.training),"Holdout leaked into training");
    assert(JSON.stringify(a.selected)===JSON.stringify(b.selected),"Holdout changed selection");
  });
  return count;
}
