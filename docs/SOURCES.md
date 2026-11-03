# Sources and references

The implementation and user-facing methodology draw on these primary sources:

1. [Robinhood, Crypto availability](https://robinhood.com/us/en/support/articles/coin-availability/) — source for the U.S. tradable listing of DOGE, SHIB, PEPE, BONK, WIF and TRUMP, checked 3 November 2026. Availability can vary by region and change over time.
2. [Robinhood, Buying and selling crypto](https://robinhood.com/us/en/support/articles/cryptocurrency-investing/) — context for around-the-clock crypto trading and maintenance exceptions. The app does not receive Robinhood availability or execution data.
3. [CoinGecko, Coin Price by IDs](https://docs.coingecko.com/reference/simple-price) — independent USD price, 24-hour change, provider timestamp and full-precision query used by the optional adapter.
4. [CoinGecko API pricing](https://www.coingecko.com/en/api/pricing) and [rate limits](https://docs.coingecko.com/docs/errors-and-rate-limits) — Demo attribution and call limits; keyless requests share an IP limit.
5. [Michael Reeves, *I Gave My Goldfish $50,000 to Trade Stocks*](https://www.youtube.com/watch?v=USKD3vPD6ZA) — creative reference for a fish-driven investment spectacle. No footage, code or assets were copied from the video.
6. [YouTube Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters) — iframe player and embed behavior.
7. [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), and [GSAP repository](https://github.com/greensock/GSAP) — the pinned opening, section reveals, chart draw, menu and trade feedback.
8. [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer) and [Three.js repository](https://github.com/mrdoob/three.js) — the procedural fish-shaped particle field and its pointer and scroll response.
9. [Florence's motion-tooling post](https://x.com/flxrnc/status/2117318336837017846) — the user's supplied repo list. GSAP and Three.js are runtime dependencies here.
10. [Lusion, About Us](https://lusion.co/about/) — visual reference for cinematic scale, monochrome depth, restrained navigation and scroll pacing. No Lusion assets or code are included.
11. [Impeccable audit reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/audit.md) — accessibility, performance, responsive design and implementation-integrity checks for final review.

The aquarium still in `public/vlad-placeholder.png` was generated specifically for this project as temporary visual content. It is **not** a photo of Vlad or a frame from the reference video. Replace it when real fish media is supplied.
