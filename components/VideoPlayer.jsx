'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Confirmed via the video host's own error message: "Link ini hanya dapat
// diputar dari halaman anichin.moe" — this is a real server-side Referer
// lock, which a browser iframe can't spoof (it sends the actual page's
// Referer, i.e. this app's own domain). So this DOES need /api/embed-proxy
// after all, now fixed to send the correct anichin.moe Referer.
function toEmbeddable(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    if (host === 'youtube.com' && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}?modestbranding=1&rel=0`;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      return `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0`;
    }
    return `/api/embed-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    // url wasn't a valid absolute URL (e.g. a bare relative path the scraper
    // picked up by mistake). Returning it raw used to make the browser
    // resolve it against THIS app's own origin — loading this very app
    // inside its own video iframe and landing on its 404 page. Safer to
    // just refuse to play it.
    return null;
  }
}

const KNOWN_LANGS = [
  'indonesia', 'indonesian', 'english', 'portuguese', 'turkish', 'spanish', 'italian', 'polish',
  'japanese', 'chinese', 'melayu', 'malay', 'thai', 'vietnamese', 'arabic', 'german', 'french', 'russian'
];

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORY_LABEL = {
  hardsub: 'Hardsub (teks nempel)',
  allsub: 'All Sub Player',
  raw: 'Raw (tanpa teks)'
};
const CATEGORY_ORDER = ['hardsub', 'allsub', 'raw'];

// Classifies every raw server label into one of 3 categories:
// - hardsub: "Hardsub Indonesia Ok.Ru" -> subtitle burned into the video, ready to watch
// - allsub: "All Sub Player Dood" -> multi-language switchable inside the player itself
// - raw: bare language names like "Indonesia" / "English" with no "Hardsub" prefix ->
//        no subtitle baked in; the source expects you to load a matching .srt yourself
//        in an external player (can't be done inside a third-party iframe embed)
function classifyServers(servers) {
  const buckets = { hardsub: new Map(), allsub: [], raw: new Map() };

  function pushLang(map, language, host, url) {
    const key = titleCase(language.trim());
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ host: host.trim() || 'Server', url });
  }

  for (const s of servers) {
    const label = (s.label || '').trim();
    if (!label || !s.url) continue;

    let m = label.match(/^hardsub\s+([a-z]+)\s+(.+)$/i);
    if (m) {
      pushLang(buckets.hardsub, m[1], m[2], s.url);
      continue;
    }
    m = label.match(/^all\s*sub\s*player\s*(.*)$/i);
    if (m) {
      buckets.allsub.push({ host: (m[1] || 'Default').trim(), url: s.url });
      continue;
    }
    if (KNOWN_LANGS.includes(label.toLowerCase())) {
      pushLang(buckets.raw, label, 'Utama', s.url);
      continue;
    }
    // Unrecognized label — safest bucket is "raw" with the label as its own
    // language/host so nothing silently disappears.
    pushLang(buckets.raw, 'Lainnya', label, s.url);
  }

  // Dailymotion (and "Daylimotion", a typo the source itself uses) blocks
  // third-party embedding on many of its videos — that's a restriction set
  // by Dailymotion/the uploader, not something fixable from our side. Sort
  // it to the end of each host list so it's never the default pick; other
  // servers get tried first automatically.
  function sortHosts(hosts) {
    return [...hosts].sort((a, b) => {
      const aBad = /dail?ymotion|daylimotion/i.test(a.host) ? 1 : 0;
      const bBad = /dail?ymotion|daylimotion/i.test(b.host) ? 1 : 0;
      return aBad - bBad;
    });
  }

  const sortLangs = (map) => [...map.entries()]
    .map(([lang, hosts]) => [lang, sortHosts(hosts)])
    .sort((a, b) => (a[0] === 'Indonesia' ? -1 : b[0] === 'Indonesia' ? 1 : 0));

  const result = {};
  if (buckets.hardsub.size) result.hardsub = sortLangs(buckets.hardsub);
  if (buckets.allsub.length) result.allsub = sortHosts(buckets.allsub);
  if (buckets.raw.size) result.raw = sortLangs(buckets.raw);
  return result;
}

const LOAD_TIMEOUT_MS = 9000;

export default function VideoPlayer({ defaultPlayer, servers = [] }) {
  const grouped = useMemo(() => classifyServers(servers), [servers]);
  const categories = CATEGORY_ORDER.filter((c) => grouped[c]);

  const [category, setCategory] = useState(categories[0] || null);
  const [langIndex, setLangIndex] = useState(0);
  const [hostIndex, setHostIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const timeoutRef = useRef(null);
  const iframeRef = useRef(null);

  const isAllSub = category === 'allsub';
  const langList = !isAllSub && category ? grouped[category] : null;
  const currentLang = langList?.[langIndex];
  const currentHosts = isAllSub ? grouped.allsub : currentLang?.[1] || [];
  const currentHost = currentHosts[hostIndex];

  const initialUrl = toEmbeddable(defaultPlayer);
  const activeUrl = currentHost ? toEmbeddable(currentHost.url) : initialUrl;

  useEffect(() => {
    if (!activeUrl) {
      // Invalid/rejected URL — the iframe never mounts, so the usual
      // onError/timeout failure path below never fires. Skip immediately
      // instead of getting stuck on "Player tidak tersedia".
      handleFailure();
      return;
    }
    setLoading(true);
    setExhausted(false);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleFailure();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl]);

  function handleLoad() {
    clearTimeout(timeoutRef.current);

    // /api/embed-proxy is same-origin, so when the upstream video host fails
    // (403/404/etc), the proxy still returns HTTP 200-ish JSON like
    // {"error": "..."}. The iframe still fires onLoad for that (browsers
    // only fire onError for network-level failures, not HTTP error bodies),
    // so without this check a failed server just gets stuck showing raw
    // JSON instead of auto-skipping to the next one.
    if (typeof activeUrl === 'string' && activeUrl.startsWith('/api/embed-proxy')) {
      try {
        const text = iframeRef.current?.contentDocument?.body?.innerText || '';
        if (/^\s*\{/.test(text) && text.includes('"error"')) {
          handleFailure();
          return;
        }
      } catch {
        // cross-origin (shouldn't happen for our own proxy, but just in
        // case) — fall through and treat it as a normal successful load.
      }
    }

    setLoading(false);
  }

  function handleFailure() {
    clearTimeout(timeoutRef.current);
    if (hostIndex < currentHosts.length - 1) {
      setHostIndex((i) => i + 1);
    } else {
      setLoading(false);
      setExhausted(true);
    }
  }

  function selectCategory(c) {
    setCategory(c);
    setLangIndex(0);
    setHostIndex(0);
  }

  function selectLanguage(i) {
    setLangIndex(i);
    setHostIndex(0);
  }

  function selectHost(i) {
    setHostIndex(i);
  }

  function manualSkip() {
    handleFailure();
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-black shadow-card">
        <div className="aspect-video">
          {activeUrl ? (
            <>
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                </div>
              )}
              {exhausted && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center">
                  <p className="text-sm font-semibold text-white">Semua server di pilihan ini gagal dimuat.</p>
                  <p className="text-xs text-white/60">Coba pilih kategori/bahasa/server lain di bawah.</p>
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={activeUrl}
                src={activeUrl}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                onLoad={handleLoad}
                onError={handleFailure}
                className="h-full w-full"
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">Player tidak tersedia</div>
          )}
        </div>
      </div>

      {!loading && !exhausted && activeUrl && (
        <button
          onClick={manualSkip}
          className="mt-2 w-full rounded-lg border border-line bg-paper-card py-2 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent"
        >
          Video error / tidak muncul? Coba server lain →
        </button>
      )}

      {category === 'raw' && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold-soft px-3 py-2.5 text-xs text-ink">
          <p className="font-bold text-ink">Video tanpa teks (raw)</p>
          <p className="mt-0.5 text-ink-soft">
            Server di kategori ini nggak ada subtitle bawaan. Kalau mau nonton pakai teks: download file
            <span className="font-semibold"> .srt</span> bahasa yang sesuai di bagian{' '}
            <span className="font-semibold">Unduh Episode</span> di bawah, lalu buka video + subtitle itu bareng
            di aplikasi pemutar video yang support subtitle eksternal (misalnya VLC atau MX Player) — nggak bisa
            langsung digabung di player web ini.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-4">
          {categories.length > 1 && (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Tipe Server</p>
              <div className="mb-3 flex gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => selectCategory(c)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      c === category ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
                    }`}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </>
          )}

          {!isAllSub && langList && (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Bahasa</p>
              <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                {langList.map(([lang], i) => (
                  <button
                    key={lang}
                    onClick={() => selectLanguage(i)}
                    className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      i === langIndex ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </>
          )}

          {currentHosts.length > 1 && (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                Server ({hostIndex + 1}/{currentHosts.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {currentHosts.map((h, i) => (
                  <button
                    key={h.host + i}
                    onClick={() => selectHost(i)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      i === hostIndex ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
                    }`}
                  >
                    {h.host}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
