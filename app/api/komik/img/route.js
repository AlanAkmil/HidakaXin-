export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new Response('Missing url', { status: 400 });

  let referer = 'https://www.webtoons.com/';
  try {
    referer = new URL(url).origin + '/';
  } catch {
    // keep default referer if url is malformed
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return new Response('Failed to proxy image', { status: 502 });

    const buf = await res.arrayBuffer();
    const headers = new Headers();
    const contentType = res.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(buf, { status: 200, headers });
  } catch (e) {
    return new Response('Proxy error', { status: 502 });
  }
}
