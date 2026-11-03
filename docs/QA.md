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

## Frontend redesign verification

- Rebuilt the interface around the user's Lusion About page reference: a full-screen monochrome fish scene, large typography, sparse pill navigation, and broad editorial sections. The fish particle geometry, layout, copy, and visuals are original to Vlad.
- `npm.cmd run check`, `npm.cmd test` (four tests), and `npm.cmd run build` passed after the redesign.
- Inspected the 1440px desktop hero, live view, portfolio, chart, and 390px mobile hero, live view, portfolio, tank map, journal, method, and sources in Playwright.
- The mobile menu opened and closed with Escape. The Sells filter displayed only the sample SPY sale. The chart and range controls remained visible on mobile.
- Browser console had zero errors and warnings. The 390px viewport had no page-level horizontal overflow.
- Reduced-motion emulation removed the WebGL canvas and left the temporary aquarium still visible. The still also serves as a fallback when WebGL cannot start.

New local screenshots: `output/playwright/redesign-desktop-hero.png` and `output/playwright/redesign-mobile-hero.png`.

## Scroll motion verification

- The hero pins during a three-beat GSAP ScrollTrigger sequence. At 1440px and 390px, the VLAD title clears, the fish-decision and ledger headlines enter in order, and the procedural fish changes scale and position. The progress rail advances with scroll.
- Chapter titles reveal by line, the live image wipes into view, and the portfolio path draws when scrolled into view.
- Direct `#portfolio` navigation landed with the heading visible at the intended 72px header offset on desktop and mobile. The mobile page had no horizontal overflow; the browser console reported no errors or warnings.
- Reduced-motion emulation removed the WebGL canvas and pin spacer, kept the temporary still visible, and left the next section directly below the hero.

Motion captures: `output/playwright/motion-desktop-start-final.png`, `output/playwright/motion-desktop-phase-one-final.png`, `output/playwright/motion-desktop-phase-three-final.png`, `output/playwright/motion-mobile-start.png`, `output/playwright/motion-mobile-phase-one-final.png`, and `output/playwright/motion-mobile-phase-two.png`. A short browser recording is at `output/playwright/vlad-scroll-sequence-final.webm`. These files are local and ignored by Git.
