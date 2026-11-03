# Verification record

Verified locally on Windows with Node.js 24.15.0 and Python 3.10 on 3 November 2026.

## Passed

- `npm.cmd run check` — frontend and server TypeScript checks passed.
- `npm.cmd test` — four signal/ledger tests passed, covering dwell, action, cooldown, low confidence, camera gap, sell limits and restart persistence.
- `npm.cmd run build` — production server and Vite client built. The decorative Three.js field is a separate chunk from the main application.
- `npm.cmd run dev` — Vite at `127.0.0.1:5173` and Express at `127.0.0.1:8787` started together; `/api/health` and the methodology document proxied correctly.
- Production `GET /api/health`, `/api/snapshot` and `/docs/METHODOLOGY.md` returned expected data.
- Authenticated observation sequence on an isolated demo ledger selected NVDA, then bought $500 of NVDA after two shortened dwell intervals. The new trade and camera source appeared in the browser via SSE.
- Missing bearer token returned HTTP 401; a null coordinate returned HTTP 400.
- An isolated clean live ledger without a quote provider held $10,000 and logged `BUY NVDA skipped: no price is available` after a valid signal. It created no trade.
- The Python tracker compiled, and its default HSV detector found the generated temporary fish at normalized position approximately `(0.701, 0.411)` with confidence `0.97`. This verifies the processing path, not real-tank calibration.
- Playwright inspection at 1440px and 390px showed the paper/preview labels, functioning trade filter and mobile menu, no browser console errors, and no page-level horizontal overflow after the chart sizing fix.
- With reduced motion emulation, the decorative WebGL canvas was absent while the page remained readable.

Local screenshots: `output/playwright/desktop-top.png` and `output/playwright/mobile-top.png` (the `output/` directory is ignored by Git).

## Pending real inputs

- Vlad's actual YouTube Live video ID, so live playback could not be verified.
- Vlad's actual camera/tank footage, so tracking thresholds and ROI remain a starting point.
- A Twelve Data key and a plan permitting the intended public quote display, so live quote polling was not exercised against the provider.
- A persistent HTTPS host, so there is no deployment verification yet.

The UI intentionally labels sample history and scenario prices in the absence of those inputs.
