# Historical options research

A fixed 12-candidate long-options experiment using an audited public research archive. See [EXPERIMENT.md](EXPERIMENT.md).

~~~sh
cd options-research
python -m pip install pandas==2.2.3 pyarrow==20.0.0
python options-history/prepare.py
node --max-old-space-size=4096 options-history/run.mjs
~~~

The SPY source parquet is approximately 632 MB. The converter streams parquet batches and preserves complete valid quote paths for potentially eligible contracts. It strictly checks published hashes and source metadata. Raw chains and normalized quote exports stay in the runner's ignored data directory. Only reports, quality diagnostics and hashes are uploaded.

Source: [lambdaclass/options_portfolio_backtester data-v1](https://github.com/lambdaclass/options_portfolio_backtester/releases/tag/data-v1). Read its [data notice](https://github.com/lambdaclass/options_portfolio_backtester/blob/master/data/DATA_NOTICE.md): historical research data, undocumented original upstream, no independent assurance. Source hash verification proves consistency with that archive, not market accuracy.

The original 12 strategies are unchanged. Select using 2020–2022 training and 2023 validation, then evaluate one frozen winner on 2024 through available 2025 coverage. Stock outcomes in overlapping periods were previously examined; actual option-profit observations are new. This is retrospective research, not untouched forward market performance.

The quote timestamp and available-as-of open interest cannot be independently verified. Daily displayed ask/bid may not have been executable. Corporate actions and adjusted option contract terms are unsupported. Standard SPY contracts are assumed to have multiplier 100.

Invalid source quote rows are excluded and counted. If an excluded/missing quote interrupts a held position, the candidate fails as data-limited. No interpolation, stale marks, synthetic option valuation or missing-price profits are permitted.

The report measures profitability and the requested 6–7% monthly target separately. No broker orders are implemented.
