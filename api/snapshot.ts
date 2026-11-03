import { buildPreviewSnapshot, loadPreviewData } from '../server/preview-db.js';

// The public Vercel deployment is a stateless sample. The persistent camera
// ledger and event stream run only on the long-lived Node server.
export default {
  async fetch(): Promise<Response> {
    try {
      const snapshot = buildPreviewSnapshot(await loadPreviewData());
      return Response.json(snapshot, {
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (error) {
      console.error('Preview snapshot failed:', error);
      return Response.json({ error: 'The preview database is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
