# Operations runbook

## Before each live session

1. Confirm the site is in `APP_MODE=live` with a fresh meme-coin database path. A demo or older stock database cannot be silently reused.
2. Set the current `YOUTUBE_LIVE_VIDEO_ID` and restart the server if it changed. Verify playback in a browser; a configured ID alone does not confirm a broadcast is currently live.
3. Verify `/api/health` reports the expected mode, quote count and stream configuration.
4. Verify the tracker preview follows Vlad rather than tank reflections or ornaments. Start its authenticated observation loop.
5. Check the public tank map changes to “Tracking.” It returns to “Offline” after 10 seconds without observations.
6. Make one observed selection/action sequence before announcing the session. Check the ledger or a visible skip reason; both are valid outcomes.

## During a session

- A stale or missing CoinGecko reference price prevents a new paper fill. Existing holdings can still display the last stored valuation, so inspect price timestamps when diagnosing a flat chart.
- The simulator does not know whether Robinhood is under maintenance or whether a coin is tradable for a viewer's region. Never describe its virtual fills as Robinhood execution.
- If the camera image changes size, crop or orientation, recalibrate `--roi` and `--mirror` before restarting observation ingest.
- If YouTube playback lags, use the server signal log to check trade timing. The tank map reflects API receipt times and is not synchronized with YouTube viewer latency.
- Keep the ingest token off the public website, screenshots and logs. Rotate it if exposed.

## Recovery

- Restarting the Node process preserves the SQLite ledger on the configured volume. It resets only the in-memory dwell/cooldown state, which is safer than carrying an unfinished selection across a restart.
- Back up the SQLite database with a SQLite-aware backup method or after stopping the server. Copying only the main `.sqlite` file during WAL activity can omit recent transactions.
- Do not erase or replace the live database to fix a display problem. Inspect `/api/snapshot`, provider errors, browser console and tracker preview first.
- A new live paper season should use a new database path and be described as a new session, so historical performance is not silently rewritten.

## Known limits

The orange HSV tracker is a baseline to calibrate on Vlad's footage. The CoinGecko adapter is a reference-price feed, with no Robinhood order-book or execution data. SQLite plus in-process SSE supports one app instance. The methodology document lists valuation omissions.
