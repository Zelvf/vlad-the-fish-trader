# Deployment notes

## Vercel sample preview

Production URL: <https://vlad-the-fish-trader-three.vercel.app/>. The project is connected to the public `Zelvf/vlad-the-fish-trader` GitHub repository and deploys from `main`.

`vercel.json` builds the Vite site in `vercel` mode and rewrites `/admin` to the React application. A dedicated free Neon database is connected to the production project as `DATABASE_URL`. `api/snapshot.ts` rebuilds the labelled sample baseline and applies persisted site settings, price overrides and admin paper trades. `api/admin.ts` authenticates changes using `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, both stored as Vercel secrets. The browser polls the public snapshot every minute. No `/api/stream` or observation-ingest route is provided on Vercel. The pending YouTube Live player can be enabled from `/admin` without changing the code.

This deployment lets the public inspect and administer the labelled sample portfolio. It is not a live fish-trading session. The admin database and the later live camera SQLite ledger are separate. See [control room guide](ADMIN.md).

## Persistent camera-driven deployment

The complete live backend is prepared for one persistent Node.js 24 process:

1. Provision a host with persistent storage and HTTPS. Mount a volume for `DATABASE_PATH`; do not use an ephemeral filesystem for the ledger.
2. Run `npm ci`, `npm run build`, then `npm start`. Expose the configured `PORT` through your host's reverse proxy.
3. Set `APP_MODE=live`, a fresh `DATABASE_PATH`, `INGEST_TOKEN`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `YOUTUBE_LIVE_VIDEO_ID`. Set `MARKET_DATA_PROVIDER=coingecko` and preferably `COINGECKO_DEMO_API_KEY` for independent USD reference prices. Keep the five-minute default polling interval within the Demo call cap.
4. Confirm the CoinGecko plan permits the planned public display and keep its key server-side. The public watchlist attributes CoinGecko. Check the [Robinhood coin-availability page](https://robinhood.com/us/en/support/articles/coin-availability/) again before describing the six-coin catalog as currently listed.
5. Run the calibrated tracker near the physical camera, pointing `VLAD_API_URL` at the public HTTPS API.
6. Verify `/api/health`, the public paper labels, stream playback, camera status, one selection and one action, a filled or skipped paper event, and persistence across a server restart.

The server currently binds to the configured `HOST` (default `127.0.0.1` for local use). Set `HOST=0.0.0.0` only where the hosting platform requires it, and use a reverse proxy for HTTPS and access controls.

YouTube Live latency means the embedded video and server signals can be offset. The interface deliberately does not draw a tracking point over the iframe. The separate tank map reflects tracker data as received by the API.

SQLite and in-process SSE are appropriate for a single instance. A multi-instance release requires a shared transactional database and shared message bus. Static-only hosting or serverless functions without persistent storage cannot preserve the ledger or continuous event stream as written.
