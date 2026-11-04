# Vlad the Fish Trader

A full-stack fish-led trading experiment with a fictional account. Vlad's location selects DOGE, SHIB, PEPE, BONK, WIF or TRUMP, then a separate BUY or SELL zone decides the order. These are meme coins shown as tradable on [Robinhood's U.S. availability page](https://robinhood.com/us/en/support/articles/coin-availability/) as checked on 3 November 2026; availability can vary by region. A persistent SQLite ledger records coin units, cash, portfolio value, skipped signals and a DOGE buy-and-hold benchmark. The public site pairs a fish-shaped particle scene with a configurable YouTube Live player, server-sent updates, a tank map, chart, holdings, history and methodology.

The default site displays **generated history** until Vlad's camera is connected. Its prices, past trades and chart points are generated values, not market data or observed fish behavior. No real money is invested and no order is placed. The project is independent of Robinhood. No Robinhood account, broker, wallet or blockchain transaction code is present.

## Public site

[Open the site](https://vlad-the-fish-trader-three.vercel.app/) or its [protected control room](https://vlad-the-fish-trader-three.vercel.app/admin). The public page starts with generated history. A dedicated Neon database stores admin edits to the site copy, YouTube Live ID, decision rules, entered prices, and manual trade entries. The generated starting history is reconstructed for each request, while admin changes persist and manual trades are labelled `Admin` in the public history. The browser polls the snapshot every minute. This Vercel release does not accept camera observations; the camera-driven ledger requires the persistent Node deployment described below. See [admin guide](docs/ADMIN.md).

## Run locally on Windows

Requires Node.js 24 or newer. From this folder:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. The API listens at `http://127.0.0.1:8787`. Edit `.env` to add Vlad's **current YouTube Live video ID** as `YOUTUBE_LIVE_VIDEO_ID`. Do not use the Michael Reeves reference video's ID as a live stream.

The local control room is at `http://127.0.0.1:5173/admin`. Set `ADMIN_PASSWORD` and a random `ADMIN_SESSION_SECRET` of at least 32 characters in `.env` to enable it. The password is never included in the frontend bundle. Local admin edits are saved to the configured SQLite ledger.

To create an observation secret, run:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put that value in `.env` as `INGEST_TOKEN`. Restart the server. The ingest endpoint is disabled without a token.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd start
```

`npm.cmd start` serves the built site and API on port 8787. The new meme-coin ledger defaults to `./data/vlad-memecoins.sqlite` and is excluded from Git. The earlier stock ledger is left intact; the app rejects a database from a different asset universe or mode.

## Connect the real fish

1. Publish the tank camera to YouTube Live through your normal streaming setup. Set the resulting live video's ID in `.env`.
2. Give the tracker access to the local webcam, OBS Virtual Camera, or a camera RTSP feed. The YouTube embed itself cannot supply frames to the tracker.
3. Install Python requirements: `python -m pip install -r tracker/requirements.txt`.
4. Calibrate before sending data: `python tracker/track_fish.py --source 0 --preview --dry-run`. Adjust `--roi`, `--hsv-lower`, `--hsv-upper` and lighting until the marker stays on Vlad.
5. Set the same `INGEST_TOKEN` in the tracker process and run `python tracker/track_fish.py --source 0 --preview`.

See [camera calibration](docs/CAMERA.md) for the exact tracking contract and limitations, and the [operations runbook](docs/OPERATIONS.md) for live sessions.

## Modes and quotes

| Mode | Portfolio data | Prices | Fish observations |
| --- | --- | --- | --- |
| `APP_MODE=demo` (default) | Generated history plus any camera entries | Generated prices | Optional; no fake live camera status |
| `APP_MODE=live` | Empty account ledger | Optional CoinGecko USD reference prices | Required for new trades |

For reference prices in live mode, set `MARKET_DATA_PROVIDER=coingecko`. Set `COINGECKO_DEMO_API_KEY` for a stable Demo allocation; keyless access is possible but subject to shared IP limits. The backend requests all six coins in one batch every five minutes by default, keeps the key server-side, and skips a recorded fill when a price is absent or stale. The UI attributes CoinGecko and labels these as **reference prices, not Robinhood execution quotes**. Review the provider's [plan and attribution terms](https://www.coingecko.com/en/api/pricing) before public release. Use **a separate `DATABASE_PATH` for live mode**.

Crypto trades around the clock on Robinhood subject to maintenance, but this app does not receive Robinhood availability or order-book state. A CoinGecko reference price cannot predict a Robinhood fill. The six-coin catalog is a documented listing snapshot, not an assertion that a specific viewer can trade every coin in their jurisdiction.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process, camera and stream status |
| GET | `/api/snapshot` | Entire public account state |
| GET/POST | `/api/admin` | Password-protected site, rule and trade-ledger controls |
| GET | `/api/stream` | Server-sent snapshot updates |
| POST | `/api/ingest/observation` | Authenticated `{x,y,confidence,observedAt}` camera observation |

Observations use normalized coordinates (`0` to `1`) and `Authorization: Bearer <INGEST_TOKEN>`. Read [methodology](docs/METHODOLOGY.md) for all trade conditions and calculations. There is no public trade button or unauthenticated write API for the portfolio. Vercel serves `/api/snapshot`, `/api/health` and `/api/admin`; the persistent Node server also serves `/api/stream` and observation ingest.

## Project map

| Path | What it does |
| --- | --- |
| `src/` | React site, GSAP intro and scroll motion, procedural Three.js fish field |
| `server/` | Express API, deterministic signal state machine, quote adapter, SQLite ledger |
| `api/` | Vercel account and admin functions backed by a dedicated Neon database |
| `shared/` | Symbols, zones and API types used by both halves |
| `tracker/` | Optional Python/OpenCV camera bridge |
| `public/vlad-placeholder.png` | Generated temporary visual; provenance and prompt in `ASSETS.md` |
| `docs/` | Architecture, methodology, camera calibration, design and sources |

## Production boundary

The real camera-driven service can be deployed to a **persistent Node 24 host**. A single long-lived process and persistent volume are needed for SQLite and SSE. Configure the live video ID, ingest secret, quote provider and camera bridge before presenting a real session. The Vercel release has an editable, database-backed **fictional** portfolio, separate from that live SQLite ledger. The site states that no real trades or money are involved. See [deployment notes](docs/DEPLOYMENT.md).
