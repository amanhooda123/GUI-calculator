# Research hypotheses and evidence requirements

## What is implemented, and why

Trend following and price breakouts are hypotheses about directional persistence, not proven edges in retail options. The engine compares both and permits cash when evidence is weak.

A purchased option's profitability depends on the move, timing, implied volatility, theta, bid/ask spread and fees. A high stock-direction prediction rate does not imply a high option-profit rate. Longer expirations reduce some timing pressure but cost more; short expirations may be cheaper while offering a higher probability of total premium loss. No expiration range is assumed best in advance.

The option grid compares 7–21, 21–45 and 45–90 DTE; trend versus breakout; and 25% versus 50% profit targets, with a 30% stop and time exits. Targets are trigger rules, not guaranteed fills. Daily sampling can miss both targets and stops; no intraday ordering is invented.

The fixed holdout and expanding walk-forward selection are designed to reduce using future results to choose historical trades. They do not eliminate multiple-testing bias, regime changes or universe selection bias. The chosen universe includes today's symbols and is not a complete historical universe.

## Still unverified

This environment has no general web browsing, paid options data subscription or broker connection. The links below are starting points to verify, not sources that were read and checked during this implementation.

- [Options Industry Council education](https://www.optionseducation.org/): option risk, Greeks, expiration and exercise.
- [Cboe DataShop](https://datashop.cboe.com/): investigate historical option quote coverage, timestamps, expired contracts and licensing.
- [ThetaData documentation](https://docs.thetadata.us/): investigate historical quote exports, pagination and subscription entitlements.
- [Interactive Brokers API documentation](https://www.interactivebrokers.com/campus/ibkr-api-page/): investigate supported account access, permissions, and paper trading.
- [Wealthsimple Help Centre](https://help.wealthsimple.com/): verify current automation support, options fees, currency fees and official terms.
- [Yahoo Finance](https://finance.yahoo.com/): underlying stock history only; the chart download used here is unofficial.

These are provider and education references; no current statement about their API availability, price or coverage has been verified.

## Required before any profit claim

1. Acquire and audit actual historical options quotes including expired contracts, as-of liquidity and corporate actions. Never reconstruct profitable option fills from stock history or Black–Scholes estimates.
2. Reserve a genuinely unseen test period; compare with passive exposure, cash, and cost stress. Inspect trade counts, loss distribution, exposure, drawdown and concentration.
3. Repeat on an independently chosen universe and materially different regimes. Two years is a starting sample, not proof.
4. Forward paper-trade using fresh bid/ask data and an account ledger. Measure fill assumptions, rejects, latency, quote age and reconciliation errors.
5. Review broker support and execution controls before contemplating live trades.

## Account and modeling limits

The model is a single USD account with one long position at a time. No borrowed money, short options, spreads, FX, interest, taxes or partial fills. Passive comparisons exclude dividends. Standard-contract metadata is checked but options corporate actions are unsupported.

End-of-day quote data cannot establish that a target limit order would have filled intraday. Stops can lose more than their threshold on gaps. A 2% premium allocation is a sizing rule, not a maximum guaranteed realized loss after costs. Repeatedly inspecting the holdout contaminates it. A positive backtest is not a promise of future profitability.
