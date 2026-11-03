# Vlad the Fish Trader

A full-stack, **paper-only** fish trading experiment. Vlad's location selects one of six stock references, then a separate BUY or SELL zone decides the order. A persistent SQLite ledger records virtual shares, cash, portfolio value, skipped signals and a SPY benchmark. The public site pairs an immersive fish-shaped particle scene with a configurable YouTube Live player, real-time state through server-sent events, a tank map, chart, holdings, history and methodology.

The default mode is a **labelled sample preview**. Its prices, past trades and chart points are scenario data, not market data or observed fish behavior. No broker, wallet or blockchain transaction code is present.

## Run locally on Windows

Requires Node.js 24 or newer. From this folder:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. The API listens at `http://127.0.0.1:8787`. Edit `.env` to add Vlad's **current YouTube Live video ID** as `YOUTUBE_LIVE_VIDEO_ID`. Do not use the Michael Reeves reference video's ID as a live stream.

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

`npm.cmd start` serves the built site and API on port 8787. The database is stored at `./data/vlad.sqlite` by default and is deliberately excluded from Git.

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
| `APP_MODE=demo` (default) | One-time sample trades plus any camera trades | Explicit scenario prices | Optional; no fake live camera status |
| `APP_MODE=live` | Clean paper ledger | Optional Twelve Data `/quote` adapter | Required for new trades |

For reference quotes in live mode, set `MARKET_DATA_PROVIDER=twelvedata` and `TWELVE_DATA_API_KEY`. The backend fetches quotes server-side and refuses a paper fill if the quote is absent, stale, or the provider marks the market closed. Check your provider plan's public display and redistribution terms before publishing its prices. Use **a separate `DATABASE_PATH` for live mode**; the server refuses to relabel a demo ledger as live.

Pons v2 can use an approved tokenized stock as a *pairing asset* for a launched token. This project currently uses stock/ETF symbols only as paper-trading references. It does not read Pons launch state or trade Pons tokens. [Pons v2 documentation](https://docs.ponsfamily.com/v2) explains the distinction.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process, camera and stream status |
| GET | `/api/snapshot` | Entire public paper state |
| GET | `/api/stream` | Server-sent snapshot updates |
| POST | `/api/ingest/observation` | Authenticated `{x,y,confidence,observedAt}` camera observation |

Observations use normalized coordinates (`0` to `1`) and `Authorization: Bearer <INGEST_TOKEN>`. Read [methodology](docs/METHODOLOGY.md) for all trade conditions and calculations. There is no public trade button or write API for the portfolio.

## Project map

| Path | What it does |
| --- | --- |
| `src/` | React site, GSAP intro and scroll motion, procedural Three.js fish field |
| `server/` | Express API, deterministic signal state machine, quote adapter, SQLite ledger |
| `shared/` | Symbols, zones and API types used by both halves |
| `tracker/` | Optional Python/OpenCV camera bridge |
| `public/vlad-placeholder.png` | Generated temporary visual; provenance and prompt in `ASSETS.md` |
| `docs/` | Architecture, methodology, camera calibration, design and sources |

## Production boundary

This is runnable locally and can be deployed to a **persistent Node 24 host**. A single long-lived process and persistent volume are needed for SQLite and SSE. Configure the live video ID, ingest secret, quote provider and camera bridge before presenting a real session. The site always identifies trades as simulated. See [deployment notes](docs/DEPLOYMENT.md).
