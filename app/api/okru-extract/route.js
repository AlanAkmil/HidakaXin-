import axios from 'axios';

export const dynamic = 'force-dynamic';

// STATUS: experimental / debug-only. OK.ru's embed page markup isn't
// documented anywhere official and changes over time — this hasn't been
// verified against a live response yet (only written from known patterns
// used by other OK.ru scrapers/extractors). Hit this route directly in the
// browser with a real ok.ru videoembed URL and send Abras the JSON back —
// if `ok: false`, `htmlPreview` shows what the page actually looks like so
// the regex can be corrected instead of guessed again.

const UA = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractMetadata(html) {
  const attempts = [];

  // Strategy 1: <div data-options="{&quot;flashvars&quot;:{&quot;metadata&quot;:&quot;{...}&quot;}}">
  let m = html.match(/data-options="([^"]*metadata[^"]*)"/);
  if (m) {
    attempts.push('data-options attribute');
    const options = tryParse(decodeHtmlEntities(m[1]));
    const metaStr = options?.flashvars?.metadata;
    if (metaStr) {
      const parsed = tryParse(metaStr);
      if (parsed) return { metadata: parsed, via: attempts };
    }
  }

  // Strategy 2: bare "metadata":"{...}" inline in a <script> block, with
  // backslash-escaped inner quotes (common when JS embeds JSON-as-string).
  m = html.match(/"metadata"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (m) {
    attempts.push('inline "metadata" string in script');
    const metaStr = m[1].replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\\\/g, '\\');
    const parsed = tryParse(metaStr);
    if (parsed) return { metadata: parsed, via: attempts };
  }

  // Strategy 3: metadata as a raw (non-stringified) JS object literal:
  // "metadata":{...} directly, no extra quoting layer.
  m = html.match(/"metadata"\s*:\s*(\{.*?\})\s*[,}]\s*"/s);
  if (m) {
    attempts.push('raw metadata object literal');
    const parsed = tryParse(m[1]);
    if (parsed) return { metadata: parsed, via: attempts };
  }

  return { metadata: null, via: attempts };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  // Which site's Referer to present to OK.ru — matters because the actual
  // CDN video URLs OK.ru hands back are signed per-request and some hosts
  // validate Referer against the site that's legitimately embedding them.
  // Defaults to Anichin's domain for backward compat with existing calls.
  const ref = searchParams.get('ref') || 'https://anichin.cafe/';

  if (!target) {
    return Response.json({ error: 'Parameter ?url= wajib diisi (link ok.ru/videoembed/...)' }, { status: 400 });
  }
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: 'URL tidak valid' }, { status: 400 });
  }
  if (!/(^|\.)ok\.ru$/.test(parsed.hostname)) {
    return Response.json({ error: 'Cuma nerima link ok.ru buat sekarang' }, { status: 400 });
  }

  try {
    const res = await axios.get(target, {
      headers: { 'User-Agent': UA, Referer: ref },
      timeout: 15000,
      validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 300) {
      return Response.json({ ok: false, error: `OK.ru balikin status ${res.status}` });
    }

    const html = String(res.data);
    const { metadata, via } = extractMetadata(html);

    if (!metadata) {
      return Response.json({
        ok: false,
        error: 'Gak nemu blok metadata — struktur halaman OK.ru kemungkinan beda dari yang diasumsikan.',
        strategiesTried: via,
        htmlLength: html.length,
        // Send this preview back so the regex can be fixed against the real markup.
        htmlPreview: html.slice(0, 3000)
      });
    }

    const videos = Array.isArray(metadata.videos)
      ? metadata.videos.map((v) => ({ quality: v.name || v.quality || null, url: v.url }))
      : [];

    return Response.json({
      ok: true,
      extractedVia: via,
      title: metadata.movie?.title || null,
      hlsManifestUrl: metadata.hlsManifestUrl || metadata.hlsMasterPlaylistUrlSSAdaptive || null,
      videos,
      metadataKeys: Object.keys(metadata)
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  }
}
