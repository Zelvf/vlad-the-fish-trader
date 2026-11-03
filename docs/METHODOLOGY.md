# Paper trading methodology

## What is simulated

All dollars, shares, orders, P&L and benchmark results on this site are virtual. `APP_MODE=demo` also uses **scenario prices and sample historical trades** to make the UI reviewable before any hardware is connected. In `APP_MODE=live`, incoming camera observations can create new paper trades against a server-fetched reference quote. Neither mode sends an order to a broker, exchange, wallet or Pons contract.

## Tank layout

`x` and `y` range from `0` to `1` within the calibrated camera crop.

| Tank region | Meaning |
| --- | --- |
| Top 36%, left/middle/right third | SPY / NVDA / TSLA |
| Next 36%, left/middle/right third | AAPL / GOOGL / MSFT |
| Bottom 28%, left half | BUY |
| Bottom 28%, right half | SELL |

The fish must be detected with confidence `>= 0.55`. A continuous stay of `DWELL_MS` (default 5 seconds) in one stock zone arms that symbol. A continuous stay of the same duration in BUY or SELL produces a decision. The selected symbol expires after two minutes. An action then enters `TRADE_COOLDOWN_MS` (default 30 seconds), and a single uninterrupted zone stay cannot fire twice. Leaving a zone resets its dwell timer.

## Fill conditions

A paper decision is **skipped and logged** if no quote exists, the quote is older than `MAX_QUOTE_AGE_MS` (default 120 seconds), a live provider reports the market closed, virtual cash is below $1 for a buy, or the portfolio has less than $1 worth of shares for a sell. The order target is `ORDER_NOTIONAL` (default $500). Buys use the lesser of that target and available virtual cash. Sells use the lesser of that target and the current value of held shares. Short selling and margin are absent.

Fractional shares are rounded **down** to six decimal places; cash and notional are rounded to cents. The trade ledger stores the side, symbol, filled shares, quote price, notional, timestamp and whether the source was a sample fixture or a camera signal. It does **not** include fees, slippage, spreads, dividends, splits, tax, borrow costs or order-book liquidity. This is why paper returns should never be treated as executable returns.

## Valuation

- **Portfolio value:** virtual cash plus the marked value of each position at the latest available quote.
- **Total P&L:** portfolio value minus initial virtual cash.
- **Today’s P&L:** current value minus the first stored equity point of the current `America/New_York` calendar day. If no point exists for that day, it begins at zero until the first point is recorded.
- **SPY benchmark:** initial virtual cash invested in SPY at the first stored SPY quote, then marked at the current stored SPY quote. This is a simple buy-and-hold comparison, not a total-return index and not dividend adjusted.
- **Unrealized P&L:** current market value minus shares times weighted average acquisition cost. Realized P&L is reflected in cash and total portfolio value but is not displayed as a separate tax-lot report.

Market quotes are fetched by an optional Twelve Data adapter. Its `close`, `previous_close`, last quote timestamp and `is_market_open` fields are used. If the provider is unavailable, prior prices remain visible with their old timestamp, but they cannot fill new paper orders once stale. Display rights for public quotes depend on the provider's plan.

## Pons v2 relationship

[Pons v2](https://docs.ponsfamily.com/v2) supports launches paired against approved assets, potentially including tokenized stocks. A tokenized stock used as a launch's quote asset is distinct from a traditional stock share. Vlad currently paper trades ticker references only. The site does not select Pons launch contracts or claim to hold tokenized equities. A future Pons-specific simulation would need a catalog of approved pair tokens, their contract addresses, units, USD valuation sources and precise curve/pool pricing rules.

## Failure visibility

The public signal log records selections, fills and skips. The tracker status goes offline after 10 seconds without observations. A configured YouTube Live iframe does not prove that the tracker is online; each status is shown separately. Camera confidence and zone dwell are observable in the tank map when a tracker is connected.
