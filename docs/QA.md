# Verification record

Verified locally on Windows with Node.js 24.15.0 and Python 3.10 on 3 November 2026.

## Current meme-coin implementation

- `npm.cmd run check` passed for frontend and server TypeScript.
- `npm.cmd run build`, `npm.cmd run build:vercel` and `vercel build --prod` passed. The Vercel-mode frontend uses one-minute snapshot polling and builds the admin, health and public snapshot functions.
- `npm.cmd test` passed eight tests: dwell/action/cooldown, confidence and camera gaps, tiny-price coin ledger fills and restart persistence, asset-universe rejection, one-batch CoinGecko mapping, admin site/rule validation, signed session and origin checks, and replay of persisted preview edits.
- The isolated local admin API accepted a password login, changed the public headline and rule timing, set a DOGE scenario price, and recorded a $100 admin-labelled paper buy. Cash became $8,650. The headline, rule, quote override and trade remained after a process restart. The test ledger is ignored in `output/`.
- A fresh browser session loaded `/admin` without console errors. Desktop and 390px mobile views had no horizontal overflow; the sign-in and overview screens were visually inspected.
- The newly provisioned Neon preview database initialized and returned the sample portfolio. A stale-revision manual trade request was rejected without an insert.
- A direct keyless request to CoinGecko's documented endpoint returned HTTP 200, all six configured IDs, positive USD prices and provider timestamps. This checks the ID mapping; it is not a claim of stable keyless service.
- An isolated `APP_MODE=live` server on port 8890 populated six CoinGecko quotes. Two shortened camera dwell intervals selected DOGE and recorded one $500 virtual DOGE buy, leaving $9,500 virtual cash. The trade source was `camera`; no real order was sent.
- The default demo API returned DOGE, SHIB, PEPE, BONK, WIF and TRUMP with `scenario` source, four sample trades and a DOGE benchmark. Small prices remained visible at full useful precision.
- Browser inspection at 1440px and 390px showed the updated hero, portfolio, tank zones and journal, no console errors or warnings, and no page-level horizontal overflow.
- The prior public Vercel release returned HTTP 200 with six scenario quotes and four sample trades. Its browser checks at 1440px and 390px found no console errors or horizontal overflow. The admin and Neon release needs a fresh production check after deployment.

Current screenshots: `output/playwright/memecoin-desktop-hero.png`, `output/playwright/memecoin-desktop-portfolio.png`, `output/playwright/memecoin-desktop-tank.png`, `output/playwright/memecoin-mobile-hero.png`, `output/playwright/memecoin-mobile-portfolio.png` and `output/playwright/memecoin-mobile-journal.png`. The `output/` directory is ignored by Git.

## Pending real inputs

- Vlad's actual YouTube Live video ID, so live playback could not be verified.
- Vlad's actual camera/tank footage, so tracking thresholds and ROI remain a starting point.
- A CoinGecko Demo key and a plan permitting the intended public price display. Keyless live polling was exercised locally, but production reliability and attribution terms still need review.
- A persistent HTTPS host for the camera-driven API. The Vercel deployment is a database-backed sample preview, not a camera receiver.

The UI intentionally labels sample history and scenario prices in the absence of those inputs.

## Motion and accessibility

The Lusion-inspired interface uses original fish geometry, copy, layout and visuals. The three-beat pinned hero, section reveals, chart draw and menu motion remain in the meme-coin version. Earlier browser checks confirmed that reduced-motion emulation removes WebGL and pinning while keeping the page readable. The new browser pass confirmed direct section navigation and the same no-overflow layout on mobile.

## Scroll motion verification

- The hero pins during a three-beat GSAP ScrollTrigger sequence. At 1440px and 390px, the VLAD title clears, the fish-decision and ledger headlines enter in order, and the procedural fish changes scale and position. The progress rail advances with scroll.
- Chapter titles reveal by line, the live image wipes into view, and the portfolio path draws when scrolled into view.
- Direct `#portfolio` navigation landed with the heading visible at the intended 72px header offset on desktop and mobile. The mobile page had no horizontal overflow; the browser console reported no errors or warnings.
- Reduced-motion emulation removed the WebGL canvas and pin spacer, kept the temporary still visible, and left the next section directly below the hero.

Motion captures: `output/playwright/motion-desktop-start-final.png`, `output/playwright/motion-desktop-phase-one-final.png`, `output/playwright/motion-desktop-phase-three-final.png`, `output/playwright/motion-mobile-start.png`, `output/playwright/motion-mobile-phase-one-final.png`, and `output/playwright/motion-mobile-phase-two.png`. A short browser recording is at `output/playwright/vlad-scroll-sequence-final.webm`. These files are local and ignored by Git.
