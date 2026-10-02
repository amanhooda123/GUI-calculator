// Pure research engine: no network, credentials, or broker orders.
export const DAY = 86400000;
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function finite(value, name, minimum = -Infinity) {
  const n = Number(value);
  assert(value !== "" && value !== null && value !== undefined && Number.isFinite(n) && n >= minimum, "Invalid " + name);
  return n;
}
export function date(value) {
  assert(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "Use ISO dates");
  const n = Date.parse(value + "T00:00:00Z");
  assert(Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === value, "Invalid calendar date");
  return n;
}
export function csv(text) {
  // Provider export format is intentionally strict: no quoted fields.
  const lines = text.trim().split(/\r?\n/);
  assert(lines.length >= 2, "CSV must have a header and rows");
  const keys = lines.shift().split(",").map(s => s.trim().toLowerCase());
  assert(new Set(keys).size === keys.length, "Duplicate CSV headers");
  return lines.map((line, i) => {
    const values = line.split(",").map(s => s.trim());
    assert(values.length === keys.length && !line.includes('"'), "Invalid CSV row " + (i + 2));
    return Object.fromEntries(keys.map((key, j) => [key, values[j]]));
  });
}
export function prices(rows) {
  const grouped = new Map(), seen = new Set();
  for (const r of rows) {
    date(r.date);
    assert(r.symbol && /^[A-Z0-9.^-]+$/.test(r.symbol), "Invalid symbol");
    const key = r.date + "|" + r.symbol;
    assert(!seen.has(key), "Duplicate price row " + key); seen.add(key);
    const p = {date:r.date, symbol:r.symbol};
    for (const k of ["open", "high", "low", "close"]) p[k] = finite(r[k], k, Number.MIN_VALUE);
    assert(p.low <= Math.min(p.open, p.close) && p.high >= Math.max(p.open, p.close) && p.high >= p.low, "Invalid OHLC");
    if (!grouped.has(p.symbol)) grouped.set(p.symbol, []);
    grouped.get(p.symbol).push(p);
  }
  for (const a of grouped.values()) a.sort((a,b) => a.date.localeCompare(b.date));
  assert(grouped.size, "No prices");
  return grouped;
}
export function quotes(rows) {
  const days = new Map(), seen = new Set(), metadata = new Map();
  for (const r of rows) {
    date(r.date); date(r.expiration);
    assert(r.contract && r.symbol && ["call","put"].includes(r.type), "Invalid option identifiers");
    const q = {...r, bid:finite(r.bid,"bid",0), ask:finite(r.ask,"ask",Number.MIN_VALUE),
      strike:finite(r.strike,"strike",Number.MIN_VALUE),
      open_interest:finite(r.open_interest,"open_interest",0),
      multiplier:finite(r.multiplier,"multiplier",1)};
    assert(q.multiplier === 100, "Only standard 100-share contracts supported");
    assert(Number.isInteger(q.open_interest) && q.ask >= q.bid && date(q.expiration) >= date(q.date), "Invalid quote");
    const meta = [q.symbol,q.expiration,q.type,q.strike,q.multiplier].join("|");
    assert(!metadata.has(q.contract) || metadata.get(q.contract) === meta, "Contract metadata changed");
    metadata.set(q.contract,meta);
    const key = q.date + "|" + q.contract;
    assert(!seen.has(key), "Duplicate option quote " + key); seen.add(key);
    if (!days.has(q.date)) days.set(q.date,new Map());
    days.get(q.date).set(q.contract,q);
  }
  assert(days.size, "No quotes");
  return days;
}
export function signal(history, index, strategy) {
  // index is today's row; the final observation used is yesterday's close.
  const n = strategy.lookback;
  if (index < Math.max(n, 21)) return 0;
  const prior = history[index-1].close;
  if (strategy.kind === "breakout") {
    const window = history.slice(index-21,index-1);
    if (prior > Math.max(...window.map(p=>p.high))) return 1;
    if (prior < Math.min(...window.map(p=>p.low))) return -1;
    return 0;
  }
  const window = history.slice(index-n,index);
  const mean = window.reduce((s,p)=>s+p.close,0)/n;
  const oldWindow = history.slice(index-n-1,index-1);
  if (oldWindow.length !== n) return 0;
  const oldMean = oldWindow.reduce((s,p)=>s+p.close,0)/n;
  if (prior > mean && mean > oldMean) return 1;
  if (prior < mean && mean < oldMean) return -1;
  return 0;
}
export function stats(equity, trades, initial) {
  assert(equity.length, "Empty backtest");
  let peak = initial, maxDrawdown = 0;
  for (const e of equity) {
    assert(Number.isFinite(e.value), "Non-finite equity");
    peak = Math.max(peak,e.value);
    maxDrawdown = Math.max(maxDrawdown,1-e.value/peak);
  }
  const final = equity.at(-1).value;
  const years = Math.max((date(equity.at(-1).date)-date(equity[0].date))/DAY/365.25,1/365.25);
  const returns = equity.map((e,i)=>e.value/(i ? equity[i-1].value : initial)-1);
  const mean = returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance = returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length;
  const wins = trades.filter(t=>t.pnl>0), losses = trades.filter(t=>t.pnl<0);
  const grossGain = wins.reduce((s,t)=>s+t.pnl,0), grossLoss = -losses.reduce((s,t)=>s+t.pnl,0);
  return {initial,final,return:final/initial-1,cagr:(final/initial)**(1/years)-1,
    maxDrawdown,sharpe:variance ? mean/Math.sqrt(variance)*Math.sqrt(252) : 0,
    trades:trades.length,winRate:trades.length ? wins.length/trades.length : null,
    profitFactor:grossLoss ? grossGain/grossLoss : null,calendarDays:Math.round(years*365.25)};
}
export function backtest(data, strategy, settings = {}) {
  const cfg = {capital:10000, premiumRisk:0.02, stockFraction:0.25, fee:0.65,
    slip:0.01, stockBps:5, maxSpread:0.15, minOI:100, ...settings};
  assert(cfg.capital > 0 && cfg.premiumRisk > 0 && cfg.premiumRisk <= 0.05 &&
    cfg.stockFraction > 0 && cfg.stockFraction <= 1 && cfg.fee >= 0 && cfg.slip >= 0 &&
    cfg.stockBps >= 0 && cfg.maxSpread > 0 && cfg.minOI >= 0, "Invalid risk/cost settings");
  const dates = [...new Set([...data.prices.values()].flatMap(a=>a.map(p=>p.date)))]
    .sort().filter(d=>(!cfg.start || d>=cfg.start) && (!cfg.end || d<=cfg.end));
  assert(dates.length >= 2, "Need at least two observations in interval");
  const index = new Map();
  for (const [symbol,a] of data.prices) index.set(symbol,new Map(a.map((p,i)=>[p.date,i])));
  let cash = cfg.capital, position = null;
  const equity = [], trades = [];
  function closePosition(d, exit, reason) {
    const proceeds = position.count * exit * (position.option ? 100 : 1) -
      (position.option ? cfg.fee*position.count : 0);
    cash += proceeds;
    trades.push({symbol:position.symbol,contract:position.contract ?? null,
      entryDate:position.entryDate,exitDate:d,count:position.count,
      entry:position.entry,exit,pnl:proceeds-position.cost,reason});
    position = null;
  }
  for (let day = 0; day < dates.length; day++) {
    const d = dates[day], last = day === dates.length-1;
    let exited = false;
    if (position) {
      const a = data.prices.get(position.symbol), i = index.get(position.symbol).get(d);
      assert(i !== undefined, "Missing underlying date while holding: " + d);
      if (position.option) {
        const q = data.quotes?.get(d)?.get(position.contract);
        assert(q, "Missing option quote while holding " + position.contract + " on " + d + "; refusing stale/fabricated prices");
        const exit = Math.max(0,q.bid-cfg.slip);
        const ret = exit/position.entry-1;
        const dte = (date(q.expiration)-date(d))/DAY;
        const held = (date(d)-date(position.entryDate))/DAY;
        const reverse = signal(a,i,strategy) === -position.direction;
        if (ret >= strategy.target || ret <= -strategy.stop || dte <= 3 ||
          held >= strategy.maxHold || reverse || last) {
          closePosition(d,exit,last ? "end" : dte<=3 ? "expiration_buffer" :
            ret>=strategy.target ? "target" : ret<=-strategy.stop ? "stop" : reverse ? "signal" : "time");
          exited = true;
        }
      } else if (signal(a,i,strategy) !== 1 || last) {
        // Signals computed before today's open. Terminal liquidation uses close.
        closePosition(d,(last ? a[i].close : a[i].open)*(1-cfg.stockBps/10000),last ? "end" : "signal");
        exited = true;
      }
    }
    if (!position && !last && !exited) {
      const candidates = [];
      for (const [symbol,a] of data.prices) {
        const i = index.get(symbol).get(d);
        if (i === undefined) continue;
        const direction = signal(a,i,strategy);
        if (!direction || (!strategy.option && direction !== 1)) continue;
        if (!strategy.option) candidates.push({symbol,a,i,direction,rank:symbol});
        else for (const q of data.quotes?.get(d)?.values() ?? []) {
          if (q.symbol !== symbol || q.type !== (direction===1 ? "call" : "put")) continue;
          const dte = (date(q.expiration)-date(d))/DAY, mid = (q.bid+q.ask)/2;
          const moneyness = q.strike/a[i-1].close;
          if (dte < strategy.minDTE || dte > strategy.maxDTE || q.bid <= 0 ||
            q.open_interest < cfg.minOI || (q.ask-q.bid)/mid > cfg.maxSpread ||
            moneyness < 0.95 || moneyness > 1.05) continue;
          const entry = q.ask+cfg.slip;
          const unit = entry*100+cfg.fee;
          if (unit > cash*cfg.premiumRisk) continue;
          candidates.push({symbol,a,i,direction,q,rank:Math.abs(moneyness-1)+
            Math.abs(dte-(strategy.minDTE+strategy.maxDTE)/2)/10000});
        }
      }
      candidates.sort((a,b)=>typeof a.rank==="number" ? a.rank-b.rank || a.q.contract.localeCompare(b.q.contract) : a.rank.localeCompare(b.rank));
      const c = candidates[0];
      if (c) {
        const entry = c.q ? c.q.ask+cfg.slip : c.a[c.i].open*(1+cfg.stockBps/10000);
        const unit = c.q ? entry*100+cfg.fee : entry;
        const count = Math.floor(Math.min(cash,cash*(c.q ? cfg.premiumRisk : cfg.stockFraction))/unit);
        if (count>0) {
          const cost=count*unit; cash-=cost;
          position={symbol:c.symbol,contract:c.q?.contract,entryDate:d,entry,cost,count,
            option:!!c.q,direction:c.direction};
        }
      }
    }
    let value = cash;
    if (position) {
      if (position.option) {
        const q=data.quotes.get(d)?.get(position.contract);
        assert(q,"Missing mark");
        value+=position.count*Math.max(0,q.bid-cfg.slip)*100-cfg.fee*position.count;
      } else {
        const a=data.prices.get(position.symbol),i=index.get(position.symbol).get(d);
        value+=position.count*a[i].close*(1-cfg.stockBps/10000);
      }
    }
    equity.push({date:d,value});
  }
  return {strategy,settings:cfg,metrics:stats(equity,trades,cfg.capital),equity,trades};
}
export function strategies(option) {
  if (!option) return [20,50,100].map(lookback=>({name:"trend-"+lookback,kind:"trend",lookback,option:false}))
    .concat([{name:"breakout-20",kind:"breakout",lookback:20,option:false}]);
  const result=[];
  for (const [minDTE,maxDTE] of [[7,21],[21,45],[45,90]])
    for (const kind of ["trend","breakout"])
      for (const target of [0.25,0.5])
        result.push({name:kind+"-"+minDTE+"-"+maxDTE+"-tp"+target,
          kind,lookback:50,option:true,minDTE,maxDTE,target,stop:0.3,
          maxHold:Math.min(30,maxDTE-4)});
  return result;
}
export function select(results, minTrades = 10) {
  const eligible=results.filter(r=>r.metrics.trades>=minTrades && r.metrics.return>0 &&
    r.metrics.maxDrawdown<=0.2);
  eligible.sort((a,b)=>(b.metrics.return-2*b.metrics.maxDrawdown)-(a.metrics.return-2*a.metrics.maxDrawdown) ||
    a.strategy.name.localeCompare(b.strategy.name));
  return eligible[0] ?? null; // Cash is a valid result; never force a trade.
}
export function research(data, settings={}) {
  const ds=[...new Set([...data.prices.values()].flatMap(a=>a.map(p=>p.date)))].sort()
    .filter(d=>(!settings.start || d>=settings.start) && (!settings.end || d<=settings.end));
  assert(ds.length>=300,"Research requires at least 300 dates; provide ~2 years plus indicator warmup");
  const grid=strategies(!!data.quotes), split=ds.length-126;
  const trainSettings={...settings,start:ds[0],end:ds[split-1]};
  const training=grid.map(s=>backtest(data,s,trainSettings));
  const chosen=select(training,settings.minTrades ?? 10);
  const testSettings={...settings,start:ds[split],end:ds.at(-1)};
  const test=chosen ? backtest(data,chosen.strategy,testSettings) : null;
  const folds=[];
  for(let end=189;end<=split;end+=63) {
    const rs=grid.map(s=>backtest(data,s,{...settings,start:ds[0],end:ds[end-64]}));
    const winner=select(rs,settings.minTrades ?? 10);
    const evaluated=winner ? backtest(data,winner.strategy,{...settings,start:ds[end-63],end:ds[end-1]}) : null;
    folds.push({trainEnd:ds[end-64],testStart:ds[end-63],testEnd:ds[end-1],
      selected:winner?.strategy.name ?? "cash",metrics:evaluated?.metrics ?? {return:0,trades:0}});
  }
  return {status:"historical_research_only",asset:data.quotes ? "options_real_quote_input" : "underlying_stock_baseline",
    dates:{start:ds[0],end:ds.at(-1),observations:ds.length,holdoutStart:ds[split]},
    candidateCount:grid.length,selection:"training return - 2 * drawdown; positive return, <=20% drawdown, >=10 trades",
    training:training.map(r=>({strategy:r.strategy,metrics:r.metrics})),
    walkForward:folds,selected:chosen?.strategy ?? null,holdout:test,
    decision:!test ? "CASH: no qualifying training strategy" :
      test.metrics.return<=0 ? "REJECT: lost money on holdout" :
      test.metrics.trades<10 ? "INCONCLUSIVE: too few holdout trades" :
      test.metrics.maxDrawdown>0.2 ? "REJECT: excessive holdout drawdown" :
      "RESEARCH CANDIDATE: requires independent data checks and forward paper trading",
    caveats:["No live execution or broker integration","Holdout is only untouched until its first inspection",
      "Quotes are assumed executable with configured adverse slippage; queue, size, latency and intraday stops are not modeled",
      "Single position, USD account, no FX, interest or taxes; gap losses can exceed a stop",
      "Contract size can prevent trades in small accounts; cheap premium does not imply high win probability",
      "Universe selection and unmodeled corporate actions can bias results"]};
}

export function paperEligible(report) {
  return !!report.selected && typeof report.decision === "string" &&
    report.decision.startsWith("RESEARCH CANDIDATE:");
}
