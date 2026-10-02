# Options Research Bot

A research engine for testing trading ideas before risking money. It supports long calls and puts across **7–21, 21–45, and 45–90 days to expiration**, plus long-only stock baselines. It does not promise profits, place real trades, or claim that backtests reproduce live trading.

The original calculator files in this repository are retained. All project code lives in this directory.

## Run

Node.js 22 or later; no dependencies or API keys are needed for the stock baseline.

~~~sh
cd options-research
node cli.mjs test
node cli.mjs download --symbols SPY,QQQ,RDDT --out data
node cli.mjs research --prices data/prices.csv --start 2024-10-02 --source-label Yahoo-raw-OHLC --out reports
~~~

Use a start date two years before your run date. Download includes 180 calendar days of indicator warmup. The historical downloader fetches completed daily stock sessions from Yahoo Finance's unofficial chart endpoint. It may be blocked or change. HTTP errors stop the run; there is no synthetic fallback. Raw stock prices exclude dividends, and any splits in the downloaded interval stop the run. Data manifest includes retrieval times, source URLs and hashes. Workflow artifacts include the input stock CSV for reproducibility. Validate data independently before relying on it.

Open **reports/report.html** or read **reports/summary.md**. The JSON report contains training candidates, expanding walk-forward folds, a final 126-session holdout, a double-cost stress test, passive stock benchmarks, equity, and the trade ledger. If no strategy qualifies, the result is **cash**.

A push to this folder also runs the checks and attempts the two-year free stock baseline in GitHub Actions. Download failures fail the research step rather than producing pretend results. Reports can be downloaded from the workflow's artifacts. No market data or secrets are committed.

## Real options backtest

Obtain a licensed point-in-time options dataset from your chosen vendor and normalize it to the schema below. Include expired contracts, consistent daily snapshots, standard contract metadata, available-as-of open interest, and sufficient quotes through every held contract's exit date. Date-only snapshots are not a substitute for tick data or executable depth.

~~~sh
node cli.mjs research --prices data/prices.csv --quotes data/options.csv --start 2024-10-02 --capital 10000 --fee 0.65 --slip 0.01 --source-label YOUR-VENDOR --out reports-options
~~~

Prices CSV:

~~~csv
date,symbol,open,high,low,close
2024-10-02,SPY,568.2,569.9,565.1,568.8
~~~

Options CSV:

~~~csv
date,symbol,contract,expiration,type,strike,bid,ask,open_interest,multiplier
2024-10-02,SPY,SPY241115C00570000,2024-11-15,call,570,8.10,8.25,2200,100
~~~

These sample rows illustrate the format and are **not verified historical observations**. They are not used in research or test performance reports.

Fees are per contract **per side**, denominated in USD. The default $0.65 is an assumption, not Wealthsimple's verified pricing. Slippage is per option share; $0.01 means $1 adverse slippage per contract per side. Customize fees to your broker, and account for CAD/USD conversion separately; the engine currently uses a USD account.

Missing held-contract quotes cause an error, not forward-filled prices. The data vendor's point-in-time coverage and quote synchronization remain your responsibility. Corporate-action-adjusted options are unsupported; only standard 100-share contracts are accepted.

## Strategy and validation

- Indicators use only information through the prior session; stock trades occur at the next open.
- Options entries pay ask plus slippage; exits receive bid minus slippage, less commissions.
- Compare trend and breakout signals with several expiration ranges and profit targets. Stops, time exits and an expiration buffer are included.
- One position at a time. Option premium plus entry fee is limited to 2% of current cash; expensive contracts are skipped. Stock allocation is 25%. Buying a cheap option does not itself increase the chance of profit.
- Final 126 sessions are held out. Earlier expanding walk-forward folds select using their training data only. Training needs at least 10 trades, a positive return and <=20% maximum drawdown; eligible strategies rank by return minus twice drawdown.
- A positive holdout remains a research candidate. Insufficient trades, drawdown, or doubled-cost losses trigger inconclusive/rejected status.
- Last-day liquidation is included. Cash earns no interest. Options returns are marked at liquidation bid, not midpoint.

This is a fixed small hypothesis grid, not exhaustive optimization. Do not repeatedly change parameters after viewing holdout results and still call that period untouched. Two years can miss major market regimes, and a few option wins provide weak statistical evidence.

## Next-session watchlist

~~~sh
node cli.mjs scan --prices data/prices.csv --report reports-options/report.json --out reports/watchlist.json
~~~

This produces a watchlist from completed sessions only when the report identifies a research candidate. Rejected, inconclusive, and cash outcomes disable scanning. It does **not** simulate a persistent brokerage account or execute orders. A live data feed, stateful paper broker, reconciled account ledger and a supported broker adapter are still needed before automation. Research cannot approve live deployment automatically.

## Brokerage and data status

No Wealthsimple API integration is claimed or implemented. Its current official API availability, terms and fees have **not been verified** in this environment. Never put account passwords, session cookies or API keys into this public repository. An officially supported broker API should be evaluated separately; Interactive Brokers is one possible research target for Canadian users, subject to account and instrument eligibility.

Historical options bid/ask coverage commonly requires licensed data. Provider candidates to investigate include Cboe DataShop and ThetaData. No provider subscription, current pricing or historical coverage was verified here.

## Research notes

See [INITIAL_RESULTS.md](INITIAL_RESULTS.md) for the first real stock-history test. See [RESEARCH.md](RESEARCH.md) for hypotheses, limitations, and source links to verify. No successful options backtest has been run merely by publishing this code.

## Verification

The deterministic checks cover delayed signals, ask/bid execution, two-sided fees, missing quotes, premium caps, terminal liquidation, invalid input and gap losses. Test quotes are synthetic fixtures for correctness only. They are never reported as real market performance.

## Further research against the 6–7% monthly target

The [expanded ETF experiment](expanded/README.md) tests nine frozen trend, RSI and momentum hypotheses with 2007–2012 training, 2013–2018 validation, and a reserved 2019–2024 historical test. See [verified ETF findings](EXPANDED_RESULTS.md): the selected strategy was positive historically but averaged about 0.71% per full month, with 24.92% drawdown. It did not meet the requested target, and doubled-cost drawdown exceeded 25%.

The [historical options experiment](options-history/README.md) audits a public third-party SPY option-chain archive before testing the original 12 long-options candidates. Its upstream accuracy and point-in-time open interest are unverified. The [verified options test](OPTIONS_RESULTS.md) lost 10.11% (13.01% at doubled costs), so the selected strategy is rejected. Results, missing-data failures, and cash decisions are reported honestly; no live fills or broker execution are claimed.

[Retrieved research notes](RETRIEVED_RESEARCH.md) distinguish the StockCharts/French pages actually read from Reddit search attempts denied with HTTP 403.
