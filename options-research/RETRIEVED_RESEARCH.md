# Retrieved strategy references

Public research collection ran in GitHub Actions. Retrieval status, timestamps, URLs and text excerpts are preserved in workflow source artifacts. A retrieved educational strategy description is a hypothesis, not profitability evidence.

## RSI mean reversion

[StockCharts RSI(2)](https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/rsi-2) was retrieved with HTTP 200. It describes Larry Connors' trend-filtered two-period RSI approach: look for oversold entries while above a 200-day moving average. Its example uses an SMA(5) exit; our precommitted variants instead use RSI >=50 or ten sessions. We do not claim an exact replication.

The page cautions that signals can be early and that gaps affect trades. Our simulation waits for the following open and applies costs.

## Relative momentum

[StockCharts Faber sector rotation](https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/fabers-sector-rotation-trading-strategy) was retrieved with HTTP 200. It describes momentum and relative-strength rotation. Our fixed candidates use 63, 126, or 252-minus-21-session momentum across a preselected set of liquid ETFs; these are independently specified test hypotheses.

[French data library](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html) was retrieved with HTTP 200 and lists momentum, short-term reversal and long-term reversal portfolios. We did not backtest those academic factor files or infer the performance of our ETF trades from them.

## Reddit

Three public JSON search attempts, covering algotrading mean reversion, algotrading ETF momentum and long-options strategy discussions, each returned HTTP 403. They yielded no discussion evidence. No authentication or anti-bot bypass was attempted.

## Historical options archive

[options_portfolio_backtester data notice](https://github.com/lambdaclass/options_portfolio_backtester/blob/master/data/DATA_NOTICE.md) and its fetch script were read directly through GitHub. They describe mirrored historical SPY chains, published hashes and undocumented original upstream sourcing. The archive is being tested separately; byte verification cannot establish market accuracy, licensing for commercial deployment or available-as-of timestamps.

The old tda-api project is defunct, and the inspected ThetaData Python package is deprecated. Neither is used as a working brokerage integration.
