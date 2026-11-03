# Verification record

Verified locally on Windows with Node.js 24.15.0 and Python 3.10 on 3 November 2026.

## Current meme-coin implementation

- `npm.cmd run check` passed for frontend and server TypeScript.
- `npm.cmd run build` and `npm.cmd run build:vercel` passed. The Vercel-mode frontend uses one-minute snapshot polling; its read-only function returned six sample quotes and four sample trades when called locally.
- `npm.cmd test` passed five tests: dwell/action/cooldown, confidence and camera gaps, tiny-price coin ledger fills and restart persistence, asset-universe rejection, and one-batch CoinGecko mapping with full precision and 24-hour changes.
- A direct keyless request to CoinGecko's documented endpoint returned HTTP 200, all six configured IDs, positive USD prices and provider timestamps. This checks the ID mapping; it is not a claim of stable keyless service.
- An isolated `APP_MODE=live` server on port 8890 populated six CoinGecko quotes. Two shortened camera dwell intervals selected DOGE and recorded one $500 virtual DOGE buy, leaving $9,500 virtual cash. The trade source was `camera`; no real order was sent.
- The default demo API returned DOGE, SHIB, PEPE, BONK, WIF and TRUMP with `scenario` source, four sample trades and a DOGE benchmark. Small prices remained visible at full useful precision.
- Browser inspection at 1440px and 390px showed the updated hero, portfolio, tank zones and journal, no console errors or warnings, and no page-level horizontal overflow.
- The public Vercel URL returned HTTP 200. `/api/snapshot` returned `demo`, six scenario quotes, four sample trades, and no camera or stream claim; `/api/health` reported `stateless-sample`. Browser checks at 1440px and 390px found no console errors or horizontal overflow. The deployment was traced to the same commit as GitHub `main`.

Current screenshots: `output/playwright/memecoin-desktop-hero.png`, `output/playwright/memecoin-desktop-portfolio.png`, `output/playwright/memecoin-desktop-tank.png`, `output/playwright/memecoin-mobile-hero.png`, `output/playwright/memecoin-mobile-portfolio.png` and `output/playwright/memecoin-mobile-journal.png`. The `output/` directory is ignored by Git.

## Pending real inputs

- Vlad's actual YouTube Live video ID, so live playback could not be verified.
- Vlad's actual camera/tank footage, so tracking thresholds and ROI remain a starting point.
- A CoinGecko Demo key and a plan permitting the intended public price display. Keyless live polling was exercised locally, but production reliability and attribution terms still need review.
- A persistent HTTPS host for the camera-driven API. The Vercel deployment is a stateless sample preview.

The UI intentionally labels sample history and scenario prices in the absence of those inputs.

## Motion and accessibility

The Lusion-inspired interface uses original fish geometry, copy, layout and visuals. The three-beat pinned hero, section reveals, chart draw and menu motion remain in the meme-coin version. Earlier browser checks confirmed that reduced-motion emulation removes WebGL and pinning while keeping the page readable. The new browser pass confirmed direct section navigation and the same no-overflow layout on mobile.

## Scroll motion verification

- The hero pins during a three-beat GSAP ScrollTrigger sequence. At 1440px and 390px, the VLAD title clears, the fish-decision and ledger headlines enter in order, and the procedural fish changes scale and position. The progress rail advances with scroll.
- Chapter titles reveal by line, the live image wipes into view, and the portfolio path draws when scrolled into view.
- Direct `#portfolio` navigation landed with the heading visible at the intended 72px header offset on desktop and mobile. The mobile page had no horizontal overflow; the browser console reported no errors or warnings.
- Reduced-motion emulation removed the WebGL canvas and pin spacer, kept the temporary still visible, and left the next section directly below the hero.

Motion captures: `output/playwright/motion-desktop-start-final.png`, `output/playwright/motion-desktop-phase-one-final.png`, `output/playwright/motion-desktop-phase-three-final.png`, `output/playwright/motion-mobile-start.png`, `output/playwright/motion-mobile-phase-one-final.png`, and `output/playwright/motion-mobile-phase-two.png`. A short browser recording is at `output/playwright/vlad-scroll-sequence-final.webm`. These files are local and ignored by Git.
