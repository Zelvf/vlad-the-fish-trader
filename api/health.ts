import { loadPreviewData } from '../server/preview-db.js';

export default {
  async fetch(): Promise<Response> {
    let databaseConnected = false;
    let streamConfigured = false;
    try { const data = await loadPreviewData(); databaseConnected = true; streamConfigured = Boolean(data.site.youtubeVideoId); }
    catch { /* Health reports the outage. */ }
    return Response.json({
      ok: databaseConnected,
      mode: 'demo',
      deployment: 'database-backed',
      databaseConnected,
      timestamp: new Date().toISOString(),
      cameraConnected: false,
      quoteProvider: 'generated',
      streamConfigured,
    }, { status: databaseConnected ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  },
};
