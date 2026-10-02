# Frozen historical options experiment

This experiment is committed before downloading or opening any options-performance result.

Source candidate: lambdaclass/options_portfolio_backtester data-v1 SPY historical chain and underlying prices. Archive states research/education use, undocumented original upstream sourcing, known possible gaps, no warranty. It is a third-party historical dataset, not independently verified exchange data.

Verify published SHA-256 hashes. Keep raw chains and normalized quote CSVs private to the runner; upload only aggregates, trade outcomes, manifests and quality diagnostics.

## Fixed strategy and periods

- Use the original core engine's 12 long-call/put candidates unchanged: trend/breakout; 7–21, 21–45, 45–90 DTE; targets 25%/50%; stop 30%; expiration buffer 3 days.
- SPY only, $10,000 USD, 2% premium budget, one position, $0.65 per contract per side, $0.01 adverse fill per option share per side.
- Entry at observed daily ask plus slippage, liquidation at bid less slippage and commission. Daily snapshots do not prove executable live fills.
- Training 2020-01-01–2022-12-31; validation 2023-01-01–2023-12-31.
- Reserved options test 2024-01-01 through available 2025 data (report actual end and coverage; do not call truncated coverage two full years).
- Stock-price outcomes in parts of these periods were previously inspected. Actual option-return observations are new; this does not constitute a wholly unseen market regime.

## Selection and quality

Require positive training and validation returns, <=20% validation drawdown, and at least 10 closed validation trades; rank by validation return minus twice maximum drawdown. Test one frozen winner once, plus doubled commissions and slippage. Choose cash if none qualify.

Quality gates: fail on hash mismatch, invalid metadata, duplicate quote keys, changed contract terms, and missing quote while holding. Do not fabricate or forward-fill prices. Invalid source quotes (non-finite, crossed, negative, or zero ask) are recorded and excluded; a resulting held-contract gap aborts that candidate as data-limited, never as a successful backtest.

Pre-filter only the union of contracts that could meet entry DTE and 5% strike-distance constraints on a same-day source quote. Preserve all subsequent valid quote rows for those contracts, including far-out-of-money and short-DTE rows, so a held position is not lost by an entry filter.

Report monthly geometric average, worst month, drawdown, frequency of 6%/7% months and doubled-cost results. Never alter rules to hit the target after observing the test.
