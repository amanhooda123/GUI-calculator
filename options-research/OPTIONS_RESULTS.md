# Historical options result — rejected

[Verified execution](https://github.com/amanhooda123/GUI-calculator/actions/runs/36967124870), code commit 47ac1f5b17aae58ef69bbc5d6414e4958d9b2958.

Both source archives matched their published SHA-256 hashes. The converter retained **5,130,162 valid SPY quote rows** across 2020-01-02 through 2025-12-12 and counted **1,328 excluded invalid quotes**. It preserved valid quote paths for candidate contracts instead of discarding held positions when their strike distance or DTE changed.

Hash verification establishes consistency with the public archive, not independent market accuracy. Original upstream sourcing and available-as-of open interest remain undocumented/unverified. These are third-party historical observations, not an exchange-certified dataset.

## Frozen selection and test

The original 12 candidates were unchanged. Training: 2020–2022. Validation: 2023. Select before opening the 2024–2025 option-return test.

Four candidates failed as **data-limited** due to a missing held-contract quote. They were not given fabricated marks or scored as valid backtests. Seven evaluated candidates failed the pre-test eligibility gates. The one qualifying strategy was **breakout, 21–45 DTE, 50% target, 30% stop, 30-day maximum hold**.

Reserved option-return test: **2024-01-01 through actual coverage ending 2025-12-12**. Earlier stock-price outcomes overlapped some of these periods; this is not a completely unseen market regime.

| Metric | Base costs | Doubled costs |
|---|---:|---:|
| Initial USD modeled capital | $10,000 | $10,000 |
| Ending modeled capital | $8,989.10 | $8,698.80 |
| Total return | **-10.11%** | **-13.01%** |
| Maximum drawdown | 11.63% | 14.34% |
| Closed trades | 43 | 42 |
| Geometric average full month | -0.41% | -0.55% |
| Worst full month | -2.77% | -2.78% |
| Full months reaching 6% | 0 / 22 | 0 / 22 |
| Full months reaching 7% | 0 / 22 | 0 / 22 |

Full-month consistency statistics conservatively exclude both endpoint months. The available test ends in December 2025 before that month was complete.

Decision: **REJECT**. The requested **6–7% monthly target is not met**.

The account used the unchanged 2% premium cap, one long position at a time, observed ask/bid plus adverse slippage and two-sided fees. Costs alter later capital and entry affordability, so the stress run can trade a different number of contracts or skip a trade.

No live orders, option midpoint fills, invented missing marks or leverage were used. Daily quoted prices may not have been executable, and quote timestamp/depth were not independently verified. Fees are assumptions, not verified Wealthsimple pricing.

[Download the full aggregate report, candidates, quality manifest and trade results](https://github.com/amanhooda123/GUI-calculator/actions/runs/36967124870/artifacts/11210092146). Raw archives and normalized quote CSVs are not redistributed.
