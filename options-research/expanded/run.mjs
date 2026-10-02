import fs from "node:fs/promises";
import crypto from "node:crypto";
import {assert,csv,prices,date} from "../core.mjs";
import {experiment,UNIVERSE,adjustedOHLC} from "./portfolio.mjs";
import {runPortfolioTests} from "./tests.mjs";
const OUT="reports-expanded";
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const pct=x=>x===null || x===undefined ? "n/a" : (100*x).toFixed(2)+"%";
await fs.mkdir(OUT,{recursive:true});
console.log(runPortfolioTests()+" portfolio tests passed");
const input=[],sources=[];
const start=date("2005-07-01")/1000,end=date("2026-10-02")/1000;
for(const symbol of UNIVERSE){
 const url="https://query1.finance.yahoo.com/v8/finance/chart/"+symbol+
  "?period1="+start+"&period2="+end+"&interval=1d&events=div%2Csplits";
 const response=await fetch(url,{headers:{"User-Agent":"options-research/0.2"},signal:AbortSignal.timeout(30000)});
 assert(response.ok,"Download failed "+symbol+" HTTP "+response.status);
 const raw=await response.text(),j=JSON.parse(raw),r=j.chart?.result?.[0];
 assert(r?.timestamp?.length && r.meta.currency==="USD","Invalid provider data "+symbol);
 const q=r.indicators.quote[0],adj=r.indicators.adjclose?.[0]?.adjclose;
 assert(adj,"Missing adjusted close "+symbol);
 let count=0,minRatio=Infinity,maxRatio=0;
 for(let i=0;i<r.timestamp.length;i++){
  const d=new Date(r.timestamp[i]*1000).toISOString().slice(0,10);
  if(d>="2026-10-02")continue;
  if(["open","high","low","close"].some(k=>q[k][i]===null || q[k][i]===undefined) || adj[i]===null || adj[i]===undefined)continue;
  const ratio=adj[i]/q.close[i];
  assert(Number.isFinite(ratio) && ratio>0,"Invalid adjustment "+symbol+" "+d);
  minRatio=Math.min(minRatio,ratio);maxRatio=Math.max(maxRatio,ratio);
  const p=adjustedOHLC(Object.fromEntries(["open","high","low","close"].map(k=>[k,q[k][i]])),adj[i]);
  input.push([d,symbol,p.open,p.high,p.low,p.close].join(","));
  count++;
 }
 sources.push({symbol,url,retrievedAt:new Date().toISOString(),rawResponseSHA256:hash(raw),
  rows:count,minAdjustmentRatio:minRatio,maxAdjustmentRatio:maxRatio,
  dividendEvents:Object.keys(r.events?.dividends ?? {}).length,splitEvents:Object.keys(r.events?.splits ?? {}).length});
}
const rawCSV="date,symbol,open,high,low,close\n"+input.sort().join("\n")+"\n";
await fs.writeFile(OUT+"/adjusted-prices.csv",rawCSV);
let data;
try {data=prices(csv(rawCSV));}
catch(error) {
 const invalid=csv(rawCSV).filter(p=>Number(p.low)>Math.min(Number(p.open),Number(p.close)) ||
  Number(p.high)<Math.max(Number(p.open),Number(p.close)) || Number(p.high)<Number(p.low));
 console.error("DATA_AUDIT "+JSON.stringify(invalid.slice(0,20)));
 throw error;
}
const provenance={source:"Yahoo unofficial historical chart endpoint",basis:"Adjusted close / raw close applied to OHLC; total-return proxy",
 verifiedAgainstIndependentVendor:false,priceSHA256:hash(rawCSV),sources,
 codeCommit:process.env.GITHUB_SHA ?? null,generatedAt:new Date().toISOString()};
await fs.writeFile(OUT+"/manifest.json",JSON.stringify(provenance,null,2)+"\n");
const report={...experiment(data),provenance};
const m=report.test?.metrics,mo=report.test?.monthly,stress=report.stress;
let researchSources=[];
try{researchSources=JSON.parse(await fs.readFile(OUT+"/sources.json","utf8"));}
catch{}
report.researchSources=researchSources.map(({label,url,status,httpStatus})=>({label,url,status,httpStatus}));
const rows=report.candidates.map(c=>"| "+c.strategy.name+" | "+pct(c.training.metrics.cagr)+" | "+
 pct(c.validation.metrics.cagr)+" | "+pct(c.validation.metrics.maxDrawdown)+" | "+c.validation.metrics.tradingEvents+" |").join("\n");
const summary="# Expanded historical research\n\n**"+report.decision+"**\n\n"+
 "Selected before opening reserved test: **"+(report.selected?.name ?? "cash")+"**.\n\n"+
 "Target: 6–7% geometric return per full month. No live or options-profit claim is made.\n\n"+
 "Train 2007–2012; select using validation 2013–2018; reserved retrospective test 2019-01-01 through 2024-10-01.\n\n"+
 "| Reserved test metric | Value |\n|---|---|\n"+
 "| Total modeled return | "+pct(m?.return)+" |\n"+
 "| Annualized modeled return | "+pct(m?.cagr)+" |\n"+
 "| Geometric mean full-month return | "+pct(mo?.geometricAverage)+" |\n"+
 "| Maximum drawdown | "+pct(m?.maxDrawdown)+" |\n"+
 "| Worst full month | "+pct(mo?.worst)+" |\n"+
 "| Full months at least 6% | "+pct(mo?.atLeast6Percent)+" |\n"+
 "| Full months at least 7% | "+pct(mo?.atLeast7Percent)+" |\n"+
 "| Full months measured | "+(mo?.fullMonths ?? 0)+" |\n"+
 "| Double-cost total return | "+pct(stress?.metrics.return)+" |\n"+
 "| Double-cost average full month | "+pct(stress?.monthly.geometricAverage)+" |\n\n"+
 "## Training and selection\n\n"+
 "| Candidate | Training CAGR | Validation CAGR | Validation drawdown | Validation fills |\n|---|---|---|---|---|\n"+rows+"\n\n"+
 "## Reserved-test passive comparisons\n\n"+
 report.benchmarks.map(b=>"- "+b.strategy.name+": "+pct(b.metrics.cagr)+" annualized, "+pct(b.metrics.maxDrawdown)+" drawdown.").join("\n")+"\n\n"+
 "## Test calendar years (endpoint years may be partial)\n\n"+
 report.annual.map(y=>"- "+y.year+": "+pct(y.return)).join("\n")+"\n\n"+
 "## Research retrieval\n\n"+report.researchSources.map(s=>"- ["+s.label+"]("+s.url+"): "+s.status+" (HTTP "+s.httpStatus+").").join("\n")+"\n\n"+
 "## Model limitations\n\n"+report.limitations.map(s=>"- "+s).join("\n")+"\n";
await fs.writeFile(OUT+"/report.json",JSON.stringify(report,null,2)+"\n");
await fs.writeFile(OUT+"/summary.md",summary);
const escape=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
await fs.writeFile(OUT+"/report.html",'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Expanded research</title><style>body{font:16px system-ui;max-width:1000px;margin:30px auto;padding:20px}pre{white-space:pre-wrap}</style><pre>'+escape(summary)+"</pre>");
const cols=["date","symbol","side","quantity","price","cost"];
await fs.writeFile(OUT+"/fills.csv",cols.join(",")+"\n"+(report.test?.fills ?? []).map(f=>cols.map(k=>f[k]).join(",")).join("\n")+"\n");
console.log(summary);
console.log("SUMMARY_JSON "+JSON.stringify({selected:report.selected,decision:report.decision,test:m,
 monthly:mo,stress:stress?.metrics,stressMonthly:stress?.monthly,annual:report.annual,
 benchmarks:report.benchmarks.map(b=>({name:b.strategy.name,metrics:b.metrics,monthly:b.monthly})),
 candidates:report.candidates.map(c=>({name:c.strategy.name,training:c.training.metrics,validation:c.validation.metrics})),
 provenance,researchSources:report.researchSources}));
