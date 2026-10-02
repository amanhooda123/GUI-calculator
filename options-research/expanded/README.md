# Expanded strategy experiment

This experiment tests a fixed nine-strategy ETF grid against the requested **6–7% monthly** target. It does not assume that target is feasible. See [EXPERIMENT.md](EXPERIMENT.md) for rules, periods and selection gates committed before the test.

Run from the parent options-research directory with Node.js 22:

~~~sh
node cli.mjs test
node expanded/sources.mjs
node expanded/run.mjs
~~~

The source collector attempts public Reddit searches and public educational/research reference pages. HTTP failures are recorded; no login bypass is attempted. StockCharts' RSI(2) page was retrieved during development. The frozen RSI candidates use RSI >=50 exits and a ten-session limit, which are variants of the page's SMA(5) exit example. This is not an exact reproduction of that published example. French's research catalogue lists momentum/reversal datasets; listing is not proof of a retail ETF edge.

The runner downloads SPY, QQQ, IWM, TLT, GLD and SHY history, applies adjusted-close ratios to OHLC as a total-return proxy, and stores inputs and hashes. Fractional adjusted-price units cannot be interpreted as real brokerage shares. Dividend reinvestment and corporate actions are approximations; validate against an independent source before relying on results.

The 2019-01-01 through 2024-10-01 period is reserved for this experiment. The previously inspected recent period is excluded. Candidate selection sees training and validation only, and evaluates one frozen winner on the reserved historical test. This is retrospective research, not future forward-testing.

Reports contain a cost stress test, passive comparisons, annual outcomes, monthly average/worst outcomes, and the frequency of months reaching 6% and 7%. Full-month statistics conservatively exclude both endpoint calendar months. No leverage is permitted. Cash is a valid selection result.

Results are in **reports-expanded/** and GitHub workflow artifacts. No broker orders or persistent paper account are implemented. Positive historical returns are labeled historical; a target miss remains a miss.

The universe is chosen today and historical vendor adjustments can be revised. Do not change the strategy after viewing its reserved-test outcome and continue calling that period untouched.
