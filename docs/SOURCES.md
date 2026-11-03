# Sources and references

The implementation and user-facing methodology draw on these primary sources:

1. [Michael Reeves, *I Gave My Goldfish $50,000 to Trade Stocks*](https://www.youtube.com/watch?v=USKD3vPD6ZA) — creative reference for a fish-driven investment spectacle. No footage, code or assets were copied from the video.
2. [Pons v2 documentation](https://docs.ponsfamily.com/v2) — protocol overview and custom pairing explanation. The current project does not integrate Pons contracts.
3. [YouTube Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters) — iframe player and embed behavior.
4. [Twelve Data REST quote documentation](https://twelvedata.com/docs/markets/market-state) — quote fields, timestamp and market-open status used by the optional adapter.
5. [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), and [GSAP repository](https://github.com/greensock/GSAP) — the pinned, scroll-scrubbed opening, section reveals, chart draw, menu and trade feedback.
6. [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer) and [Three.js repository](https://github.com/mrdoob/three.js) — the procedural fish-shaped particle field and its pointer and scroll response.
7. [Florence's motion-tooling post](https://x.com/flxrnc/status/2117318336837017846) — the user's supplied list of 14 production repositories. GSAP and Three.js are used in the website. Remotion, Blender, FFmpeg, HyperFrames, caption and voice tooling are video production tools and are not runtime dependencies here.
8. [Lusion, About Us](https://lusion.co/about/) — visual reference supplied by the user for cinematic scale, monochrome depth, restrained navigation, and scroll pacing. No Lusion assets or code are included.
9. [Impeccable audit reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/audit.md) — accessibility, performance, responsive design and implementation-integrity checks for final review.

The aquarium still in `public/vlad-placeholder.png` was generated specifically for this project as temporary visual content. It is **not** a photo of Vlad or a frame from the reference video. Replace it when real fish media is supplied.
