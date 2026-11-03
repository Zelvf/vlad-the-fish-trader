export default {
  fetch(): Response {
    return Response.json({
      ok: true,
      mode: 'demo',
      deployment: 'stateless-sample',
      timestamp: new Date().toISOString(),
      cameraConnected: false,
      quoteProvider: 'scenario',
      streamConfigured: /^[\w-]{11}$/.test(process.env.YOUTUBE_LIVE_VIDEO_ID?.trim() || ''),
    }, { headers: { 'Cache-Control': 'no-store' } });
  },
};
