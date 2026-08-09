export const dynamic = 'force-dynamic';

// Usage: /api/test-kurama?url=TARGET&grep=PATTERN&context=150&max=15
// Searches the fetched HTML/JS text for a pattern and returns snippets around each match.
// Fallback (no grep param): behaves like before -> ?url=...&start=0&len=20000 raw slice.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const grep = searchParams.get('grep');
  const context = parseInt(searchParams.get('context') || '150', 10);
  const maxMatches = parseInt(searchParams.get('max') || '15', 10);
  const start = parseInt(searchParams.get('start') || '0', 10);
  const len = Math.min(parseInt(searchParams.get('len') || '20000', 10), 100000);

  if (!target) {
    return Response.json({ error: 'Missing ?url= param' }, { status: 400 });
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': target,
      },
      redirect: 'follow',
    });

    const html = await res.text();

    if (grep) {
      let re;
      try {
        re = new RegExp(grep, 'gi');
      } catch (e) {
        return Response.json({ error: 'Invalid regex', message: e.message }, { status: 400 });
      }
      const matches = [];
      let m;
      let count = 0;
      while ((m = re.exec(html)) !== null && count < maxMatches) {
        const s = Math.max(0, m.index - context);
        const e = Math.min(html.length, m.index + m[0].length + context);
        matches.push({ index: m.index, snippet: html.slice(s, e) });
        count++;
        if (m.index === re.lastIndex) re.lastIndex++; // avoid infinite loop on zero-length match
      }
      return Response.json({
        status: res.status,
        totalLength: html.length,
        pattern: grep,
        matchCount: matches.length,
        matches,
      });
    }

    return Response.json({
      status: res.status,
      totalLength: html.length,
      sliceStart: start,
      sliceEnd: Math.min(start + len, html.length),
      html: html.slice(start, start + len),
    });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
