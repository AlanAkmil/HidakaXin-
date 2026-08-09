import axios from 'axios';

export const dynamic = 'force-dynamic';

const candidates = [
  'https://www.sankavollerei.web.id/anime/home',
  'https://www.sankavollerei.com/anime/home',
  'https://sankavollerei.com/anime/home',
];

export async function GET() {
  const results = [];

  for (const url of candidates) {
    try {
      const res = await axios.get(url, { timeout: 10000 });
      results.push({
        url,
        ok: true,
        status: res.status,
        upstreamOk: res.data?.ok,
        keys: Object.keys(res.data?.data || res.data || {}),
      });
    } catch (err) {
      results.push({
        url,
        ok: false,
        status: err.response?.status || null,
        error: err.code || err.message,
        bodyPreview: err.response?.data
          ? JSON.stringify(err.response.data).slice(0, 300)
          : null,
      });
    }
  }

  return Response.json({ results }, { status: 200 });
}
