import fs from "node:fs/promises";
import {csv,prices,quotes,backtest,strategies,assert} from "../core.mjs";
import {monthly} from "../expanded/portfolio.mjs";
const OUT="reports-options-real";
const data={prices:prices(csv(await fs.readFile("data/options-archive/prices.csv","utf8"))),
 quotes:quotes(csv(await fs.readFile("data/options-archive/options.csv","utf8")))};
const provenance=JSON.parse(await fs.readFile(OUT+"/manifest.json","utf8"));
const periods={training:{start:"2020-01-01",end:"2022-12-31"},
 validation:{start:"2023-01-01",end:"2023-12-31"},
 test:{start:"2024-01-01",end:provenance.coverage.lastOptionsDate}};
const candidates=[];
for(const strategy of strategies(true)){
 const row={strategy};
 try{
  const training=backtest(data,strategy,periods.training);
  const validation=backtest(data,strategy,periods.validation);
  row.training=training.metrics;row.validation=validation.metrics;row.status="evaluated";
 }catch(e){
  row.status="data_limited";row.reason=e.message;
 }
 candidates.push(row);
}
const eligible=candidates.filter(r=>r.status==="evaluated" && r.training.return>0 &&
 r.validation.return>0 && r.validation.maxDrawdown<=0.2 && r.validation.trades>=10);
eligible.sort((a,b)=>(b.validation.return-2*b.validation.maxDrawdown)-
 (a.validation.return-2*a.validation.maxDrawdown) || a.strategy.name.localeCompare(b.strategy.name));
const selected=eligible[0]?.strategy ?? null;
let test=null,stress=null,testMonthly=null,stressMonthly=null,error=null;
if(selected){
 try{
  test=backtest(data,selected,periods.test);
  stress=backtest(data,selected,{...periods.test,fee:1.3,slip:0.02});
  testMonthly=monthly(test.equity,10000);stressMonthly=monthly(stress.equity,10000);
 }catch(e){error=e.message;}
}
let decision=!selected ? "CASH: no qualifying options strategy" : error ?
 "DATA-LIMITED: held-contract quotes missing or invalid; profitability not established" :
 test.metrics.return<=0 || stress.metrics.return<=0 ? "REJECT: options test or double costs lost money" :
 test.metrics.maxDrawdown>0.2 || stress.metrics.maxDrawdown>0.2 ? "REJECT: options drawdown exceeded 20%" :
 testMonthly.targetAchieved && stressMonthly.targetAchieved ? "HISTORICAL TARGET MET: unverified dataset, forward validation required" :
 "HISTORICALLY POSITIVE: 6-7% monthly target not established";
const report={asset:"SPY long options on unverified third-party historical bid/ask",periods,
 candidates,selected,test,stress,testMonthly,stressMonthly,error,decision,provenance,
 goalMet:!!testMonthly?.targetAchieved && !!stressMonthly?.targetAchieved && decision.startsWith("HISTORICAL TARGET MET")};
await fs.writeFile(OUT+"/report.json",JSON.stringify(report,null,2)+"\n");
const pct=x=>x===null || x===undefined ? "n/a" : (100*x).toFixed(2)+"%";
const summary="# Historical SPY options experiment\n\n**"+decision+"**\n\n"+
 "Requested target: 6–7% per month. Source: third-party historical archive with undocumented upstream sourcing; no independent accuracy or point-in-time OI verification.\n\n"+
 "Options coverage: "+provenance.coverage.firstOptionsDate+" through "+provenance.coverage.lastOptionsDate+
 "; "+provenance.coverage.validQuotes+" normalized quotes; "+provenance.coverage.invalidQuotesExcluded+" invalid rows excluded.\n\n"+
 "Training 2020–2022; validation 2023; options test 2024 through the actual available 2025 endpoint. Stock-price outcomes in some of these periods were previously inspected.\n\n"+
 "Frozen winner: "+(selected?.name ?? "cash")+".\n\n"+
 "| Test metric | Value |\n|---|---|\n"+
 "| Return | "+pct(test?.metrics.return)+" |\n| Monthly geometric average | "+pct(testMonthly?.geometricAverage)+
 " |\n| Maximum drawdown | "+pct(test?.metrics.maxDrawdown)+" |\n| Trades | "+(test?.metrics.trades ?? 0)+
 " |\n| Worst full month | "+pct(testMonthly?.worst)+" |\n| Months at least 6% | "+pct(testMonthly?.atLeast6Percent)+
 " |\n| Double-cost return | "+pct(stress?.metrics.return)+" |\n\n"+
 (error ? "Data error: "+error+"\n\n" : "")+
 "## All training/validation outcomes\n\n| Strategy | Train return | Validation return | Validation trades | Status |\n|---|---|---|---|---|\n"+
 candidates.map(r=>"| "+r.strategy.name+" | "+pct(r.training?.return)+" | "+pct(r.validation?.return)+" | "+
 (r.validation?.trades ?? "n/a")+" | "+r.status+(r.reason ? ": "+r.reason : "")+" |").join("\n")+"\n\n"+
 "No live orders, exact live-fill claim, short options or leverage. Missing held-contract quotes are not filled or invented. Cash earns zero. USD account, no FX or taxes. Raw chain files are not redistributed.\n";
await fs.writeFile(OUT+"/summary.md",summary);
console.log(summary);
console.log("OPTIONS_RESULT "+JSON.stringify({decision,selected,goalMet:report.goalMet,
 test:test?.metrics,stress:stress?.metrics,testMonthly,stressMonthly,error,candidates,periods,provenance}));
