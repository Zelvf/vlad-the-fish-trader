import { buildPreviewSnapshot, loadPreviewData } from '../server/preview-db.js';

// The public Vercel deployment is a database-backed simulation. The persistent camera
// ledger and event stream run only on the long-lived Node server.
export default {
  async fetch(): Promise<Response> {
    try {
      const snapshot = buildPreviewSnapshot(await loadPreviewData());
      return Response.json(snapshot, {
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (error) {
      console.error('Account snapshot failed:', error);
      return Response.json({ error: 'The account database is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
