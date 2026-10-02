# Expanded ETF results — profitable historically, monthly target missed

[Verified execution](https://github.com/amanhooda123/GUI-calculator/actions/runs/36966654505), code commit 6f62b441d0cbdb4e1b64f94db8d97ac726b5e1e6. The experiment rules were committed before observing outcomes.

[Download data, full report, monthly returns, fills, hashes and retrieved-source evidence](https://github.com/amanhooda123/GUI-calculator/actions/runs/36966654505/artifacts/11210495526).

## What the frozen experiment found

Selected using 2007–2012 training and 2013–2018 validation: **126-session momentum rotation**, monthly selection of up to two positive-momentum ETFs from SPY, QQQ, IWM, TLT and GLD; each qualifying ETF gets 50%, with missing sleeves in cash. No leverage.

Reserved retrospective test: **2019-01-01 through 2024-10-01**. Previously inspected 2024-10-02 onward prices were excluded.

| Metric | Base costs | Doubled costs |
|---|---:|---:|
| $10,000 ending modeled value | $16,376.39 | $16,111.47 |
| Total return | +63.76% | +61.11% |
| Annualized return | +8.96% | +8.65% |
| Geometric average per full month | +0.71% | +0.68% |
| Maximum drawdown | 24.92% | 25.15% |
| Worst full month | -7.76% | -7.85% |

Across 68 measured full months, **6 reached 6%** and **5 reached 7%**. These isolated months do not establish sustained monthly target returns.

Calendar test outcomes: 2019 **-8.26%**, 2020 **+28.65%**, 2021 **+22.64%**, 2022 **-21.78%**, 2023 **+23.39%**, and partial 2024 **+17.21%**.

The double-cost drawdown exceeded 25%. The strategy is not approved for live execution.

## Passive comparisons over the same test

| Model | Annualized return | Maximum drawdown |
|---|---:|---:|
| Selected rotation | 8.96% | 24.92% |
| SPY buy and hold | 17.53% | 33.72% |
| QQQ buy and hold | 23.12% | 35.12% |
| Monthly 60% SPY / 40% TLT | 10.34% | 27.56% |

The selected strategy earned less than all three passive benchmarks, with lower drawdown. The result establishes only positive historical modeled returns, not superior returns or future profitability.

## Sources actually retrieved

- [StockCharts RSI(2)](https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/rsi-2): describes a 200-day trend filter and low RSI entries. The tested RSI exit is an explicitly documented variant.
- [StockCharts Faber rotation](https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/fabers-sector-rotation-trading-strategy): describes relative-strength rotation. The experiment uses a fixed ETF universe and is not an exact reproduction.
- [Kenneth French data library](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html): lists momentum and reversal research datasets; that catalogue does not prove this retail strategy has an edge.
- Reddit public searches returned **HTTP 403**. No Reddit discussion was successfully retrieved or used as evidence.

## Model limits

This is a total-return adjusted-OHLC proxy using fractional adjusted units, not actual broker shares or exact live fills. Yahoo data was hash-recorded but not independently checked with another vendor. Returns include modeled trading costs and approximate dividend reinvestment; FX, taxes, live liquidity, latency and cash interest are absent. Today's chosen universe creates selection bias.

The base engine's 19 tests and expanded portfolio's 12 tests passed in GitHub Actions. The OHLC adjustment fix applies the same multiplication to all fields and prevents one-unit floating-point bound errors; the strict data checks remain active.

**The requested 6–7% monthly goal is not met.**
