#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {assert,csv,prices,quotes,research,backtest,signal,date} from "./core.mjs";
import {runTests} from "./tests.mjs";
function options(args) {
  const result={};
  for(let i=0;i<args.length;i+=2) {
    assert(args[i]?.startsWith("--") && args[i+1] && !args[i+1].startsWith("--"),"Flags need values");
    result[args[i].slice(2)]=args[i+1];
  }
  return result;
}
async function save(file,value) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,typeof value==="string" ? value : JSON.stringify(value,null,2)+"\n");
}
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
async function readData(o) {
  assert(o.prices,"Supply --prices CSV");
  const raw=await fs.readFile(o.prices,"utf8");
  const data={prices:prices(csv(raw))};
  const provenance={prices:{file:o.prices,sha256:hash(raw)},sourceLabel:o["source-label"] ?? "user-supplied, unverified"};
  if(o.quotes) {
    const q=await fs.readFile(o.quotes,"utf8");
    data.quotes=quotes(csv(q));
    provenance.quotes={file:o.quotes,sha256:hash(q)};
    // Every supplied quote must match a real underlying date.
    for(const [d,qs] of data.quotes) for(const q of qs.values())
      assert(data.prices.get(q.symbol)?.some(p=>p.date===d),"Quote without matching underlying date: "+d+" "+q.symbol);
  }
  return {data,provenance};
}
function config(o) {
  const r={};
  for(const [flag,key] of [["capital","capital"],["fee","fee"],["slip","slip"],
    ["premium-risk","premiumRisk"],["stock-bps","stockBps"]]) if(o[flag]!==undefined) {
      r[key]=Number(o[flag]);assert(Number.isFinite(r[key]),"Invalid --"+flag);
    }
  if(o.start) {date(o.start);r.start=o.start;}
  if(o.end) {date(o.end);r.end=o.end;}
  return r;
}
function pct(n) {return n===null || n===undefined ? "n/a" : (n*100).toFixed(2)+"%";}
function esc(s) {return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function markdown(report) {
  const m=report.holdout?.metrics;
  return "# Historical strategy research\n\n"+
    "**"+report.decision+"**\n\n"+
    "Asset: "+report.asset+". Data source: "+report.provenance.sourceLabel+".\n\n"+
    "Dates: "+report.dates.start+" to "+report.dates.end+
    "; untouched holdout begins "+report.dates.holdoutStart+".\n\n"+
    "Selected strategy: "+(report.selected?.name ?? "cash")+".\n\n"+
    "| Holdout metric | Value |\n|---|---|\n"+
    "| Return after modeled costs | "+pct(m?.return ?? 0)+" |\n"+
    "| Maximum drawdown | "+pct(m?.maxDrawdown ?? 0)+" |\n"+
    "| Closed trades | "+(m?.trades ?? 0)+" |\n"+
    "| Win rate | "+pct(m?.winRate)+" |\n\n"+
    "Stock baseline results do not establish options profitability. No real orders were placed.\n\n"+
    "## Limitations\n\n"+report.caveats.map(s=>"- "+s).join("\n")+"\n";
}
function html(report) {
  const md=markdown(report);
  const rows=report.training.map(r=>"<tr><td>"+esc(r.strategy.name)+"</td><td>"+
    pct(r.metrics.return)+"</td><td>"+pct(r.metrics.maxDrawdown)+"</td><td>"+
    r.metrics.trades+"</td></tr>").join("");
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'+
    "<title>Historical trading research</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px;background:#101827;color:#e5e7eb}"+
    "pre{white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #374151;text-align:left}</style>"+
    "<h1>Historical trading research</h1><pre>"+esc(md)+"</pre>"+
    "<h2>Training candidates</h2><p>Training figures are used for selection and are not independent performance evidence.</p>"+
    "<table><tr><th>Strategy</th><th>Return</th><th>Drawdown</th><th>Trades</th></tr>"+rows+"</table>";
}
async function download(o) {
  const out=o.out ?? "data";
  const symbols=(o.symbols ?? "SPY,QQQ,RDDT").split(",").map(s=>s.trim().toUpperCase()).sort();
  assert(symbols.length && symbols.every(s=>/^[A-Z0-9.^-]+$/.test(s)),"Invalid symbols");
  const today=new Date().toISOString().slice(0,10);
  const researchStart=o.start ?? new Date(date(today)-730*86400000).toISOString().slice(0,10);
  date(researchStart);
  const warmupStart=new Date(date(researchStart)-180*86400000).toISOString().slice(0,10);
  const period1=Math.floor(date(warmupStart)/1000),period2=Math.floor(date(today)/1000);
  const rows=[],sources=[];
  for(const symbol of symbols) {
    const url="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+
      "?period1="+period1+"&period2="+period2+"&interval=1d&events=div%2Csplits";
    const response=await fetch(url,{headers:{"User-Agent":"options-research/0.1"},signal:AbortSignal.timeout(30000)});
    assert(response.ok,"Historical download failed for "+symbol+": HTTP "+response.status);
    const raw=await response.text(),json=JSON.parse(raw),r=json.chart?.result?.[0];
    assert(r?.timestamp?.length,"No historical prices for "+symbol);
    assert(r.meta?.currency==="USD","Only USD instruments supported");
    assert(!Object.keys(r.events?.splits ?? {}).length,
      "Split in downloaded data: use a vetted corporate-action-adjusted export for "+symbol);
    const q=r.indicators.quote[0];
    let accepted=0;
    for(let i=0;i<r.timestamp.length;i++) {
      const d=new Date(r.timestamp[i]*1000).toISOString().slice(0,10);
      if(d>=today) continue; // Never use a possibly unfinished session.
      if(["open","high","low","close"].some(k=>q[k][i]===null || q[k][i]===undefined)) continue;
      rows.push([d,symbol,q.open[i],q.high[i],q.low[i],q.close[i]].join(","));
      accepted++;
    }
    sources.push({symbol,url,retrievedAt:new Date().toISOString(),responseSHA256:hash(raw),
      acceptedRows:accepted,dividendEvents:Object.keys(r.events?.dividends ?? {}).length});
  }
  const content="date,symbol,open,high,low,close\n"+rows.sort().join("\n")+"\n";
  prices(csv(content)); // Validate before writing.
  const manifest={source:"Yahoo Finance chart endpoint; unofficial and may be blocked or change",
    researchStart,warmupStart,priceBasis:"raw OHLC; splits rejected; dividends excluded",
    sourceVerification:"Downloaded from source; not cross-checked with an independent vendor",
    sources,pricesSHA256:hash(content),optionsIncluded:false};
  await save(path.join(out,"prices.csv"),content);
  await save(path.join(out,"manifest.json"),manifest);
  console.log("Downloaded underlying history to "+out+". No historical option data was downloaded.");
}
async function runResearch(o) {
  const {data,provenance}=await readData(o),cfg=config(o);
  const report={...research(data,cfg),provenance,generatedAt:new Date().toISOString()};
  report.caveats.push("Cash earns zero. Equity baseline excludes dividends and assumes raw prices without splits.");
  if(report.selected) {
    const testCfg={...cfg,start:report.dates.holdoutStart,end:report.dates.end};
    const stressed=backtest(data,report.selected,{...testCfg,fee:(cfg.fee ?? 0.65)*2,
      slip:(cfg.slip ?? 0.01)*2,stockBps:(cfg.stockBps ?? 5)*2});
    report.costStress={assumption:"Double modeled commissions and slippage",metrics:stressed.metrics};
    if(stressed.metrics.return<=0 && report.holdout?.metrics.return>0)
      report.decision="REJECT: positive holdout became unprofitable with doubled costs";
  }
  // Long-only passive comparison for each symbol: same dates, whole shares, same stock costs.
  report.passiveBenchmarks=[];
  for(const [symbol,a] of data.prices) {
    const segment=a.filter(p=>p.date>=report.dates.holdoutStart && p.date<=report.dates.end);
    if(segment.length<2) continue;
    const initial=cfg.capital ?? 10000,bps=(cfg.stockBps ?? 5)/10000;
    const entry=segment[0].open*(1+bps),count=Math.floor(initial/entry);
    const final=initial-count*entry+count*segment.at(-1).close*(1-bps);
    report.passiveBenchmarks.push({symbol,return:final/initial-1,dividendsIncluded:false});
  }
  const out=o.out ?? "reports";
  await save(path.join(out,"report.json"),report);
  await save(path.join(out,"summary.md"),markdown(report));
  await save(path.join(out,"report.html"),html(report));
  const trades=report.holdout?.trades ?? [];
  const columns=["symbol","contract","entryDate","exitDate","count","entry","exit","pnl","reason"];
  await save(path.join(out,"trades.csv"),columns.join(",")+"\n"+
    trades.map(t=>columns.map(k=>t[k] ?? "").join(",")).join("\n")+"\n");
  console.log(markdown(report));
}
async function scan(o) {
  assert(o.report,"Supply --report generated report.json");
  const report=JSON.parse(await fs.readFile(o.report,"utf8"));
  const {data}=await readData(o);
  assert(report.selected,"Research selected cash: no strategy to scan");
  const candidates=[];
  for(const [symbol,a] of data.prices) {
    // Signals for the next session based on the latest completed observation.
    const direction=signal(a,a.length,report.selected);
    if(direction) candidates.push({symbol,asOf:a.at(-1).date,direction:direction===1 ? "bullish" : "bearish",
      instrument:report.selected.option ? (direction===1 ? "call" : "put") : "stock",
      expirationRange:report.selected.option ? [report.selected.minDTE,report.selected.maxDTE] : null});
  }
  const preview={status:"watchlist_only_no_orders",strategy:report.selected,candidates,
    note:"Signals are hypotheses, not trade recommendations. Fresh executable quotes and forward paper testing are required."};
  await save(o.out ?? "reports/watchlist.json",preview);
  console.log(JSON.stringify(preview,null,2));
}
async function main() {
  const [command,...args]=process.argv.slice(2);
  if(command==="test") {console.log(runTests()+" engine tests passed");return;}
  const o=options(args);
  if(command==="download") return download(o);
  if(command==="research") return runResearch(o);
  if(command==="scan") return scan(o);
  throw new Error("Usage: node cli.mjs test | download --symbols SPY,QQQ,RDDT --out data | research --prices data/prices.csv [--quotes data/options.csv] [--start YYYY-MM-DD] --out reports | scan --prices data/prices.csv --report reports/report.json");
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
