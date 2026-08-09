import { NextResponse } from 'next/server';
import axios from 'axios';

// Whitelist domain yang boleh diproxy — jangan biarin route ini jadi
// open proxy buat sembarang URL (rawan disalahgunakan orang lain).
const ALLOWED_HOSTS = [
  'anichin.moe',
  'anichin.forum',
  'anichin.cc',
  'anichin.cafe',
  'anichin.stream',
  'anichin-player.web.id',
  'ok.ru',
  'rpmshare.com',
  'earnvids.com',
  'abysscdn.com',
  'streamhg.com',
  'dood.re', 'dood.wf', 'dood.pm', 'dood.li', 'dood.ws',
  'mixdrop.co', 'mixdrop.to',
  'streamtape.com',
  'rumble.com',
  'dailymotion.com',
  'short.icu',
  'listeamed.net'
  // tambahin host provider server lain di sini kalau ternyata ke-block juga
];

function isAllowedHost(hostname) {
  return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));
}

const ANICHIN_REFERER = 'https://anichin.cafe/';

// PENTING: pakai axios, bukan fetch() bawaan Node/Vercel. Spec Fetch API
// (WHATWG) mendaftarkan "Referer" sebagai forbidden header — banyak runtime
// (termasuk fetch() di Node/Vercel) diam-diam MEMBUANG header Referer yang
// diset manual lewat objek headers, walau kodenya keliatan benar dan gak ada
// error sama sekali. axios gak terikat batasan itu karena bikin request HTTP
// langsung lewat http/https module Node, jadi Referer beneran terkirim.
async function fetchUpstream(url, withReferer) {
  return axios.get(url, {
    headers: {
      ...(withReferer ? { Referer: ANICHIN_REFERER, Origin: 'https://anichin.cafe' } : {}),
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
    },
    maxRedirects: 5,
    responseType: 'text',
    validateStatus: () => true, // handle non-2xx ourselves instead of throwing
    timeout: 15000
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Parameter url wajib diisi' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Host tidak diizinkan untuk diproxy' }, { status: 403 });
  }

  try {
    let upstream = await fetchUpstream(parsed.toString(), true);
    // Some hosts reject a mismatched/unexpected Referer but allow requests
    // with none at all — worth one retry before giving up.
    if (upstream.status < 200 || upstream.status >= 300) {
      upstream = await fetchUpstream(parsed.toString(), false);
    }

    if (upstream.status < 200 || upstream.status >= 300) {
      return NextResponse.json(
        { error: `Upstream balikin status ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers['content-type'] || 'text/html; charset=utf-8';
    let body = upstream.data;

    // Kalau responsnya HTML, resource internal (script/css/img) yang pake path
    // relatif bakal salah resolve kalau di-serve dari domain kita sendiri.
    // Inject <base> biar semua path relatif tetep ngarah ke domain asli.
    if (contentType.includes('text/html')) {
      const baseTag = `<base href="${parsed.origin}${parsed.pathname.replace(/\/[^/]*$/, '/')}">`;
      if (/<head[^>]*>/i.test(body)) {
        body = body.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
      } else {
        body = baseTag + body;
      }
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // biar iframe dari domain kita boleh nampilin ini
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal fetch embed', detail: e.message }, { status: 502 });
  }
}
