import fs from "node:fs/promises";
const sources=[
 {label:"Reddit r/algotrading mean reversion",url:"https://www.reddit.com/r/algotrading/search.json?q=RSI%20mean%20reversion&restrict_sr=on&sort=top&t=all&limit=8",kind:"reddit"},
 {label:"Reddit r/algotrading momentum",url:"https://www.reddit.com/r/algotrading/search.json?q=momentum%20ETF&restrict_sr=on&sort=top&t=all&limit=8",kind:"reddit"},
 {label:"Reddit r/options long options",url:"https://www.reddit.com/r/options/search.json?q=long%20calls%20strategy&restrict_sr=on&sort=top&t=all&limit=8",kind:"reddit"},
 {label:"StockCharts Faber sector rotation reference",url:"https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/fabers-sector-rotation-trading-strategy",kind:"html"},
 {label:"StockCharts RSI2 reference",url:"https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/rsi-2",kind:"html"},
 {label:"French academic data library",url:"https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html",kind:"html"}
];
await fs.mkdir("reports-expanded",{recursive:true});
const results=[];
for(const s of sources) {
 const record={...s,retrievedAt:new Date().toISOString()};
 try{
  const r=await fetch(s.url,{headers:{"User-Agent":"options-research/0.2 (public strategy research)"},signal:AbortSignal.timeout(20000)});
  record.httpStatus=r.status;
  if(!r.ok) {record.status="not_retrieved";record.reason="HTTP "+r.status;}
  else if(s.kind==="reddit") {
   const j=await r.json();
   record.discussions=(j.data?.children ?? []).map(c=>({title:c.data.title,url:"https://www.reddit.com"+c.data.permalink,
    createdUTC:c.data.created_utc,score:c.data.score,excerpt:(c.data.selftext ?? "").slice(0,1200)}));
   record.status=record.discussions.length ? "retrieved" : "no_results";
  } else {
   const h=await r.text();
   const body=h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"")
    .replace(/<[^>]+>/g," ").replace(/&(?:nbsp|amp|quot|lt|gt);/g," ").replace(/\s+/g," ").trim();
   // Focus on strategy or research terms, retain enough context to read the source.
   const needle=/RSI|moving average|tactical|momentum/i.exec(body);
   const offset=Math.max(0,(needle?.index ?? 0)-200);
   record.excerpt=body.slice(offset,offset+10000);record.status="retrieved";
  }
 }catch(e){record.status="not_retrieved";record.reason=e.message;}
 results.push(record);
 console.log("SOURCE "+JSON.stringify(record));
}
await fs.writeFile("reports-expanded/sources.json",JSON.stringify(results,null,2)+"\n");
