# Deployment notes

## Vercel sample preview

`vercel.json` builds the Vite site in `vercel` mode. `api/snapshot.ts` creates a temporary in-memory demo ledger for each request; `api/health.ts` reports the stateless sample mode. The browser polls the snapshot every minute. No `/api/stream` or observation-ingest route is provided on Vercel, and sample trades are never persisted. The pending YouTube Live player can be enabled later by setting a valid 11-character `YOUTUBE_LIVE_VIDEO_ID` environment variable and redeploying.

This deployment lets the public inspect the interface, methodology, and labelled sample portfolio. It is not a live fish-trading session.

## Persistent camera-driven deployment

The complete live backend is prepared for one persistent Node.js 24 process:

1. Provision a host with persistent storage and HTTPS. Mount a volume for `DATABASE_PATH`; do not use an ephemeral filesystem for the ledger.
2. Run `npm ci`, `npm run build`, then `npm start`. Expose the configured `PORT` through your host's reverse proxy.
3. Set `APP_MODE=live`, a fresh `DATABASE_PATH`, `INGEST_TOKEN`, and `YOUTUBE_LIVE_VIDEO_ID`. Set `MARKET_DATA_PROVIDER=coingecko` and preferably `COINGECKO_DEMO_API_KEY` for independent USD reference prices. Keep the five-minute default polling interval within the Demo call cap.
4. Confirm the CoinGecko plan permits the planned public display and keep its key server-side. The public watchlist attributes CoinGecko. Check the [Robinhood coin-availability page](https://robinhood.com/us/en/support/articles/coin-availability/) again before describing the six-coin catalog as currently listed.
5. Run the calibrated tracker near the physical camera, pointing `VLAD_API_URL` at the public HTTPS API.
6. Verify `/api/health`, the public paper labels, stream playback, camera status, one selection and one action, a filled or skipped paper event, and persistence across a server restart.

The server currently binds to the configured `HOST` (default `127.0.0.1` for local use). Set `HOST=0.0.0.0` only where the hosting platform requires it, and use a reverse proxy for HTTPS and access controls.

YouTube Live latency means the embedded video and server signals can be offset. The interface deliberately does not draw a tracking point over the iframe. The separate tank map reflects tracker data as received by the API.

SQLite and in-process SSE are appropriate for a single instance. A multi-instance release requires a shared transactional database and shared message bus. Static-only hosting or serverless functions without persistent storage cannot preserve the ledger or continuous event stream as written.
