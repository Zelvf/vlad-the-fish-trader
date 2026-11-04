# Trading methodology

## What the account represents

All account values, trades, P&L and benchmark results on this site are fictional. No money is invested and no real order is placed. `APP_MODE=demo` uses **generated prices and history** to make the UI reviewable before hardware is connected. In `APP_MODE=live`, camera observations can add trade entries against a server-fetched CoinGecko USD reference price. Neither mode sends an order to Robinhood, another broker, an exchange, or a wallet. The project is independent of Robinhood.

The six choices are DOGE, SHIB, PEPE, BONK, WIF and TRUMP. They appeared as tradable on [Robinhood's U.S. crypto availability page](https://robinhood.com/us/en/support/articles/coin-availability/) when checked on 3 November 2026. Availability changes and can depend on location. The catalog is a selection rule for the experiment, not a live listing feed.

## Tank layout

`x` and `y` range from `0` to `1` within the calibrated camera crop.

| Tank region | Meaning |
| --- | --- |
| Top 36%, left/middle/right third | DOGE / SHIB / PEPE |
| Next 36%, left/middle/right third | BONK / WIF / TRUMP |
| Bottom 28%, left half | BUY |
| Bottom 28%, right half | SELL |

The fish must be detected with confidence `>= 0.55`. A continuous stay of `DWELL_MS` (default 5 seconds) in one coin zone arms that symbol. A continuous stay of the same duration in BUY or SELL produces a decision. The selected symbol expires after two minutes. An action then enters `TRADE_COOLDOWN_MS` (default 30 seconds), and a single uninterrupted zone stay cannot fire twice. Leaving a zone resets its dwell timer.

## Fill conditions

A decision is **skipped and logged** if no price exists, the provider timestamp is older than `MAX_QUOTE_AGE_MS` (default 10 minutes), account cash is below $1 for a buy, or the portfolio has less than $1 worth of the selected coin for a sell. The order target is `ORDER_NOTIONAL` (default $500). Buys use the lesser of that target and available account cash. Sells use the lesser of that target and the current value of held units. Short selling and margin are absent. The app does not query Robinhood maintenance status; its fills are never actual Robinhood orders.

Coin units are rounded **down** to six decimal places; cash and notional are rounded to cents. Tiny coin prices retain provider precision, so SHIB, PEPE and BONK do not display or fill at `$0.00`. The trade ledger stores the side, symbol, filled units, reference price, notional, timestamp and whether the source was a generated entry or a camera signal. It does **not** include Robinhood spreads or fees, slippage, taxes, network costs or order-book liquidity. Displayed returns cannot be treated as executable returns.

## Valuation

- **Portfolio value:** account cash plus the marked value of each position at the latest available quote.
- **Total P&L:** portfolio value minus initial account cash.
- **Today's P&L:** current value minus the first stored equity point of the current UTC calendar day. If no point exists for that day, it begins at zero until the first point is recorded.
- **DOGE benchmark:** initial account cash invested in DOGE at the first stored DOGE reference price, then marked at the current DOGE reference price. This is a simple buy-and-hold comparison.
- **Unrealized P&L:** current market value minus coin units times weighted average acquisition cost. Realized P&L is reflected in cash and total portfolio value but is not displayed as a separate tax-lot report.
- **24-hour move:** the CoinGecko change percentage is used to derive a comparison price 24 hours earlier. If that percentage is unavailable, the move is displayed as unavailable rather than zero.

The optional [CoinGecko `/simple/price` endpoint](https://docs.coingecko.com/reference/simple-price) returns USD prices, 24-hour changes and provider timestamps for all six mapped coin IDs in one request. The default five-minute polling interval fits under the currently published 10,000-call monthly Demo cap for one continuously running instance, with some room for restarts. If the provider is unavailable, prior prices remain visible with their old timestamp, but they cannot fill new trade entries once stale. The site attributes CoinGecko where these prices appear; review the provider's display rights and plan before public release.

## Robinhood relationship

Robinhood supplies the listing reference only. The app does not log in to Robinhood, call a Robinhood trading API, read its order book or make Robinhood trades. CoinGecko aggregates independent market prices, so the displayed fill can differ from any venue's executable price. Crypto may trade on Robinhood around the clock subject to maintenance and local availability; those platform conditions are outside the app's feed.

## Failure visibility

The public signal log records selections, fills and skips. The tracker status goes offline after 10 seconds without observations. A configured YouTube Live iframe does not prove that the tracker is online; each status is shown separately. Camera confidence and zone dwell are observable in the tank map when a tracker is connected.
