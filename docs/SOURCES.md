# Sources and references

The implementation and user-facing methodology draw on these primary sources:

1. [Michael Reeves, *I Gave My Goldfish $50,000 to Trade Stocks*](https://www.youtube.com/watch?v=USKD3vPD6ZA) — creative reference for a fish-driven investment spectacle. No footage, code or assets were copied from the video.
2. [Pons v2 documentation](https://docs.ponsfamily.com/v2) — protocol overview and custom pairing explanation. The current project does not integrate Pons contracts.
3. [YouTube Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters) — iframe player and embed behavior.
4. [Twelve Data REST quote documentation](https://twelvedata.com/docs/markets/market-state) — quote fields, timestamp and market-open status used by the optional adapter.
5. [GSAP Timeline documentation](https://gsap.com/docs/v3/GSAP/Timeline/) and [GSAP repository](https://github.com/greensock/GSAP) — coordinated initial page motion and event feedback.
6. [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer) and [Three.js repository](https://github.com/mrdoob/three.js) — lightweight ambient water particles behind the hero.
7. [Florence's motion-tooling post](https://x.com/flxrnc/status/2117318336837017846) — the user's supplied list of 14 production repositories. GSAP and Three.js are used in the website. Remotion, Blender, FFmpeg, HyperFrames, caption and voice tooling are video production tools and are not runtime dependencies here.
8. [Impeccable audit reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/audit.md) — accessibility, performance, responsive design and implementation-integrity checks for final review.

The aquarium still in `public/vlad-placeholder.png` was generated specifically for this project as temporary visual content. It is **not** a photo of Vlad or a frame from the reference video. Replace it when real fish media is supplied.
