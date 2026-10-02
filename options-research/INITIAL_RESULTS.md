# Initial historical result — rejected

This is an actual stock-history baseline run, **not an options backtest** and not evidence of profitable live trading.

Verified in [GitHub Actions run 36965534578](https://github.com/amanhooda123/GUI-calculator/actions/runs/36965534578), at commit 1d8896e7c282717f640d36b0bc6a4a4c332bd364.

- Downloaded SPY, QQQ and RDDT daily underlying stock history from Yahoo Finance.
- Research interval: 2024-10-02 through 2026-10-01, with earlier indicator warmup.
- Reserved final 126 sessions, beginning 2026-04-02.
- Selected from training: trend-20.
- Holdout return after modeled stock trading costs: **-2.96%**.
- Maximum holdout drawdown: **6.16%**.
- Closed holdout trades: **13**.
- Holdout win rate: **38.46%**.
- Engine verification: **17 tests passed** in Node.js in this run.
- Research decision: **REJECT: lost money on holdout**.

The GitHub job completed successfully; that means the code and research ran, not that the strategy succeeded.

[Download the original reports and data manifest](https://github.com/amanhooda123/GUI-calculator/actions/runs/36965534578/artifacts/11208784637). Future runs additionally include the input stock CSV.

Results use a $10,000 USD account, a single position, a 25% stock allocation, and 5 basis points of adverse stock fill cost per side. Raw OHLC excludes dividends; splits are rejected by the downloader. Source observations were not independently cross-checked against another vendor.

No options quotes were acquired and no real orders were placed. Changing strategy rules after viewing these results would make this holdout part of the development process; a fresh independent test period would then be required.

A later patch added rejection gates for watchlist generation and two tests for those gates. Rejected strategies cannot produce a trading watchlist.
