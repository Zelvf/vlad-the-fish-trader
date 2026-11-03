# Deployment notes

The current application is prepared for one persistent Node.js 24 process. It has not been deployed by this repository.

1. Provision a host with persistent storage and HTTPS. Mount a volume for `DATABASE_PATH`; do not use an ephemeral filesystem for the ledger.
2. Run `npm ci`, `npm run build`, then `npm start`. Expose the configured `PORT` through your host's reverse proxy.
3. Set `APP_MODE=live`, a fresh `DATABASE_PATH`, `INGEST_TOKEN`, and `YOUTUBE_LIVE_VIDEO_ID`. Set `MARKET_DATA_PROVIDER=twelvedata` with `TWELVE_DATA_API_KEY` if reference quotes are desired.
4. Confirm your quote provider permits the planned public display/redistribution. The key must stay server-side.
5. Run the calibrated tracker near the physical camera, pointing `VLAD_API_URL` at the public HTTPS API.
6. Verify `/api/health`, the public paper labels, stream playback, camera status, one selection and one action, a filled or skipped paper event, and persistence across a server restart.

The server currently binds to the configured `HOST` (default `127.0.0.1` for local use). Set `HOST=0.0.0.0` only where the hosting platform requires it, and use a reverse proxy for HTTPS and access controls.

YouTube Live latency means the embedded video and server signals can be offset. The interface deliberately does not draw a tracking point over the iframe. The separate tank map reflects tracker data as received by the API.

SQLite and in-process SSE are appropriate for a single instance. A multi-instance release requires a shared transactional database and shared message bus. Static-only hosting or serverless functions without persistent storage cannot preserve the ledger or continuous event stream as written.
