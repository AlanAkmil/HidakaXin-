import axios from 'axios';

export const dynamic = 'force-dynamic';

// Locked to OK.ru's known video CDN domains only — this exists purely so
// requests to the signed CDN URLs come from OUR server's IP (the one the
// signature was issued for), not the visitor's browser. OK.ru is part of
// the VK/Mail.ru group and its video CDN spreads across multiple domains
// depending which server actually hosts a given video — confirmed so far:
// okcdn.ru AND vkuser.net (same video, different upload, different host).
// Anichin-specific, not a general proxy — keep this narrow but expect to
// add more VK-family CDN domains here if new ones show up.
function isAllowedCdnHost(hostname) {
  const allowedSuffixes = ['okcdn.ru', 'vkuser.net', 'mycdn.me'];
  return allowedSuffixes.some((h) => hostname === h || hostname.endsWith('.' + h));
}

const UA = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const ref = searchParams.get('ref') || 'https://anichin.cafe/';

  if (!target) {
    return Response.json({ error: 'Parameter url wajib diisi' }, { status: 400 });
  }
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: 'URL tidak valid' }, { status: 400 });
  }
  if (!isAllowedCdnHost(parsed.hostname)) {
    return Response.json({ error: 'Host tidak diizinkan untuk diproxy' }, { status: 403 });
  }

  const range = request.headers.get('range');

  try {
    const upstream = await axios.get(target, {
      headers: {
        'User-Agent': UA,
        Referer: ref,
        ...(range ? { Range: range } : {})
      },
      responseType: 'stream',
      validateStatus: () => true,
      timeout: 20000
    });

    if (upstream.status >= 400) {
      return Response.json({ error: `Upstream balikin status ${upstream.status}` }, { status: 502 });
    }

    const contentLength = Number(upstream.headers['content-length'] || 0);
    const upstreamContentType = upstream.headers['content-type'] || '';

    // A real video chunk is at minimum tens/hundreds of KB. Anything tiny,
    // or a content-type that isn't remotely video-ish, is almost certainly
    // an error page/JSON from OK.ru (expired signature, wrong IP this
    // request happened to come from, etc) rather than actual video bytes.
    // Read and surface it as text instead of silently piping it through
    // mislabeled as video/mp4 — that just produces a confusing
    // MEDIA_ERR_SRC_NOT_SUPPORTED in the browser with zero information.
    const looksLikeError =
      (contentLength > 0 && contentLength < 20000) ||
      (upstreamContentType && !/video|octet-stream|mp4|mpegurl/i.test(upstreamContentType));

    if (looksLikeError) {
      const chunks = [];
      for await (const chunk of upstream.data) chunks.push(chunk);
      const bodyText = Buffer.concat(chunks).toString('utf8').slice(0, 2000);
      return Response.json({
        ok: false,
        error: 'Response dari OK.ru kelihatan bukan video asli (kemungkinan link expired/invalid untuk request ini).',
        upstreamStatus: upstream.status,
        upstreamContentType,
        upstreamContentLength: contentLength,
        bodyPreview: bodyText
      });
    }

    const headers = new Headers();
    for (const h of ['content-length', 'content-range', 'accept-ranges']) {
      if (upstream.headers[h]) headers.set(h, upstream.headers[h]);
    }
    if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');
    // Force video/mp4 regardless of whatever upstream sends — these
    // okcdn.ru links are confirmed mp4, but upstream's own content-type
    // header (e.g. a generic octet-stream) makes the HTML5 <video> element
    // reject it as unsupported even though the bytes are fine. A full-page
    // browser navigation to the same URL plays it fine because Chrome
    // sniffs the actual bytes there instead of trusting the header —
    // <video> doesn't do that sniffing, so we set it explicitly.
    headers.set('content-type', 'video/mp4');
    headers.set('cache-control', 'no-store');

    // upstream.data is a Node Readable stream (axios responseType: 'stream')
    // — Web Response needs a Web ReadableStream, so wrap it.
    const webStream = new ReadableStream({
      start(controller) {
        upstream.data.on('data', (chunk) => controller.enqueue(chunk));
        upstream.data.on('end', () => controller.close());
        upstream.data.on('error', (err) => controller.error(err));
      },
      cancel() {
        upstream.data.destroy();
      }
    });

    return new Response(webStream, { status: upstream.status, headers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
