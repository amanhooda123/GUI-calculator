# Frozen research experiment 2

Goal requested: 6–7% per month. This is a benchmark, not a promised outcome.

This specification is committed before the new historical test runs. The previously inspected 2024-10-02 through 2026-10-01 period is development data and is excluded from the new reserved test.

## Fixed universe and periods

- ETFs: SPY, QQQ, IWM, TLT, GLD, SHY, chosen in advance for equities, bonds, gold and short-duration Treasuries.
- Source history: 2005-07-01 through 2026-10-01; at least 252 sessions of warmup.
- Training: 2007-01-01 through 2012-12-31.
- Validation for algorithmic selection: 2013-01-01 through 2018-12-31.
- Reserved historical test: 2019-01-01 through 2024-10-01.
- Previously seen recent data is not called an untouched test.

Historical retrospective evaluation is not forward paper trading. The universe is chosen today, creating selection bias.

## Fixed candidate set

1. SPY 200-session moving-average trend, 100% maximum allocation.
2. QQQ 200-session moving-average trend, 100% maximum allocation.
3. SPY 50-session moving-average trend, 100% maximum allocation.
4. SPY RSI(2) mean reversion: enter <=5 when above SMA(200), exit >=50 or after 10 sessions.
5. Same RSI(2) strategy with entry <=10.
6. Monthly top-two positive 63-session momentum across SPY/QQQ/IWM/TLT/GLD, equal weights.
7. Monthly top-two positive 126-session momentum over the same universe.
8. Monthly top-two positive momentum from 252 sessions ago through 21 sessions ago, same universe.
9. Monthly dual momentum: better of SPY and QQQ over 126 sessions; if neither is positive use SHY.

Monthly means the first observed session of a new calendar month. Signals use the previous completed session; trades occur at the next open. No leverage, options reconstruction, or shorting. Empty allocation earns zero.

## Fill and price assumptions

Historical prices are dividend/split-adjusted OHLC proxies derived from Yahoo adjusted close / close. Fractional adjusted-price units model total-return exposure; they are not actual broker-share transactions. Cost is 5 basis points per traded side and tested again at 10 basis points. No FX, tax, spread depth, borrowing or fill queues. Label every result as a total-return stock/ETF proxy, not options or exact live P&L.

## Selection and results

Run all candidates on training and validation only. Require positive training and validation return, validation maximum drawdown <=25%, and at least 12 validation trading events. Rank eligible candidates by validation annualized return minus half maximum drawdown. If none qualify, choose cash.

Then evaluate only the frozen winner on the reserved test, with doubled costs. Compare passive SPY, QQQ and monthly 60/40 SPY/TLT exposure. Report monthly geometric return, fraction of full months reaching 6% and 7%, worst month, drawdown, total returns, trading events and annual results. Exclude partial first/last months from monthly consistency metrics.

Passing a positive test can establish historical profitability under the model; it cannot guarantee future profit. Do not iterate on reserved-test outcomes or relabel tuning as validation.

## External research

Attempt public Reddit searches and academic/strategy reference pages with honest retrieval status, URLs, timestamps and excerpts. Public endpoints may deny access; denied responses are not research evidence. Do not bypass authentication or anti-bot restrictions.
