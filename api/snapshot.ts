import { Store } from '../server/store.js';
import { SignalEngine } from '../server/signal-engine.js';

// The public Vercel deployment is a stateless sample. The persistent camera
// ledger and event stream run only on the long-lived Node server.
export default {
  fetch(): Response {
    const store = new Store(':memory:', 'demo', 10_000);
    try {
      const videoId = process.env.YOUTUBE_LIVE_VIDEO_ID?.trim();
      const snapshot = store.snapshot(new SignalEngine(5_000, 20_000), {
        youtubeVideoId: videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null,
        dwellMs: 5_000,
        cooldownMs: 20_000,
        orderNotional: 500,
      });
      return Response.json(snapshot, {
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } finally {
      store.close();
    }
  },
};
