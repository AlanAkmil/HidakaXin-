'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// AnimeXin's actual site — used as the Referer when talking to OK.ru so its
// signed CDN links validate correctly (different domain than Anichin's).
const ANIMEXIN_REF = 'https://animexin.dev/';

function isOkRu(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === 'ok.ru';
  } catch {
    return false;
  }
}

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

// Ported as-is from the original VideoPlayer.jsx — same classification
// rules, same Dailymotion-deprioritization, same "raw = no baked-in
// subtitle" semantics. Not touched, just relocated.
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
    pushLang(buckets.raw, 'Lainnya', label, s.url);
  }

  // Rank: Ok.ru first (0), everything else in the middle (1), Dailymotion
  // always last (2) — regardless of the order the source site lists them in.
  function hostRank(h) {
    if (isOkRu(h.url)) return 0;
    if (/dail?ymotion|daylimotion/i.test(h.host)) return 2;
    return 1;
  }
  function sortHosts(hosts) {
    return [...hosts].sort((a, b) => hostRank(a) - hostRank(b));
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

const QUALITY_LABELS = { mobile: '144p', lowest: '240p', low: '360p', sd: '480p', hd: '720p', full: '1080p' };
function qualityLabel(quality, index) {
  return QUALITY_LABELS[quality] || quality || `Kualitas ${index + 1}`;
}
function pickDefaultQualityIndex(videos) {
  const idx = videos.findIndex((v) => v.quality === 'sd');
  return idx >= 0 ? idx : Math.floor(videos.length / 2);
}

const LOAD_TIMEOUT_MS = 9000;

export default function AnimeXinVideoPlayer({ defaultPlayer, servers = [] }) {
  const grouped = useMemo(() => classifyServers(servers), [servers]);
  const categories = CATEGORY_ORDER.filter((c) => grouped[c]);

  const [category, setCategory] = useState(categories[0] || null);
  const [langIndex, setLangIndex] = useState(0);
  const [hostIndex, setHostIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const timeoutRef = useRef(null);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isAllSub = category === 'allsub';
  const langList = !isAllSub && category ? grouped[category] : null;
  const currentLang = langList?.[langIndex];
  const currentHosts = isAllSub ? grouped.allsub : currentLang?.[1] || [];
  const currentHost = currentHosts[hostIndex];

  const resolvedOkRuUrl = currentHost && isOkRu(currentHost.url) ? currentHost.url : null;

  const initialUrl = toEmbeddable(defaultPlayer);
  const activeUrl = !resolvedOkRuUrl ? (currentHost ? toEmbeddable(currentHost.url) : initialUrl) : null;

  useEffect(() => {
    if (resolvedOkRuUrl) return;
    if (!activeUrl) {
      handleFailure();
      return;
    }
    setLoading(true);
    setExhausted(false);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => handleFailure(), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, resolvedOkRuUrl]);

  function handleLoad() {
    clearTimeout(timeoutRef.current);
    if (typeof activeUrl === 'string' && activeUrl.startsWith('/api/embed-proxy')) {
      try {
        const text = iframeRef.current?.contentDocument?.body?.innerText || '';
        if (/^\s*\{/.test(text) && text.includes('"error"')) {
          handleFailure();
          return;
        }
      } catch {
        // cross-origin, treat as success
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

  const [okruVideos, setOkruVideos] = useState(null);
  const [okruQualityIndex, setOkruQualityIndex] = useState(0);
  const [okruLoading, setOkruLoading] = useState(false);
  const [okruError, setOkruError] = useState(null);
  const [okruPlaybackError, setOkruPlaybackError] = useState(null);

  useEffect(() => {
    setOkruVideos(null);
    setOkruError(null);
    setOkruPlaybackError(null);
    setOkruQualityIndex(0);
    if (!resolvedOkRuUrl) return;

    let cancelled = false;
    setOkruLoading(true);
    fetch(`/api/okru-extract?url=${encodeURIComponent(resolvedOkRuUrl)}&ref=${encodeURIComponent(ANIMEXIN_REF)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.videos?.length) {
          setOkruVideos(data.videos);
          setOkruQualityIndex(pickDefaultQualityIndex(data.videos));
        } else {
          setOkruError(data.error || 'Gagal ambil link video dari OK.ru');
        }
      })
      .catch((e) => {
        if (!cancelled) setOkruError(e.message);
      })
      .finally(() => {
        if (!cancelled) setOkruLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOkRuUrl]);

  const activeOkruVideo = okruVideos?.[okruQualityIndex];

  const MEDIA_ERROR_LABELS = {
    1: 'MEDIA_ERR_ABORTED — dibatalkan',
    2: 'MEDIA_ERR_NETWORK — gagal jaringan pas ambil video',
    3: 'MEDIA_ERR_DECODE — gagal decode/format rusak',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED — src gak didukung / gagal dimuat'
  };
  function handleVideoError(e) {
    const err = e.currentTarget.error;
    setOkruPlaybackError(
      err ? `${MEDIA_ERROR_LABELS[err.code] || `Error code ${err.code}`}${err.message ? ` — ${err.message}` : ''}` : 'Gagal muat video (unknown error)'
    );
  }
  function selectOkruQuality(i) {
    setOkruPlaybackError(null);
    setOkruQualityIndex(i);
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen();
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
    setMenuOpen(false);
  }
  function manualSkip() {
    handleFailure();
  }

  return (
    <div>
      <div ref={containerRef} className="relative rounded-xl border border-line bg-black shadow-card">
        <div className="relative aspect-video overflow-hidden rounded-xl">
          {resolvedOkRuUrl ? (
            okruLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-white/60">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                Ngambil link video dari OK.ru...
              </div>
            ) : activeOkruVideo ? (
              <video
                key={activeOkruVideo.url}
                src={`/api/okru-stream?url=${encodeURIComponent(activeOkruVideo.url)}&ref=${encodeURIComponent(ANIMEXIN_REF)}`}
                controls
                controlsList="nofullscreen"
                autoPlay
                muted
                playsInline
                onError={handleVideoError}
                onCanPlay={() => setOkruPlaybackError(null)}
                className="h-full w-full bg-black"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <p className="text-sm text-white/70">{okruError || 'Gagal muat video dari OK.ru'}</p>
                <button onClick={manualSkip} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-accent hover:text-accent">
                  Coba lagi →
                </button>
              </div>
            )
          ) : activeUrl ? (
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
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">Player tidak tersedia</div>
          )}

          {!resolvedOkRuUrl && loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
            </div>
          )}
          {!resolvedOkRuUrl && exhausted && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center">
              <p className="text-sm font-semibold text-white">Semua server di pilihan ini gagal dimuat.</p>
              <p className="text-xs text-white/60">Buka menu ⚙️ buat ganti bahasa/tipe server.</p>
            </div>
          )}
          {resolvedOkRuUrl && okruPlaybackError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center">
              <p className="text-sm font-semibold text-white">Video gagal dimuat</p>
              <p className="max-w-xs break-words text-xs text-white/60">{okruPlaybackError}</p>
              <button onClick={manualSkip} className="mt-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-accent hover:text-accent">
                Coba lagi →
              </button>
            </div>
          )}
        </div>

        <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Pengaturan player"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-white/10 bg-black/90 p-3 backdrop-blur">
                  {categories.length > 1 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Tipe Server</p>
                      <div className="flex flex-col gap-1">
                        {categories.map((c) => (
                          <button
                            key={c}
                            onClick={() => selectCategory(c)}
                            className={`rounded px-2 py-1.5 text-left text-xs font-semibold ${c === category ? 'bg-accent/20 text-accent' : 'text-white/80 hover:bg-white/10'}`}
                          >
                            {CATEGORY_LABEL[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isAllSub && langList && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Bahasa</p>
                      <div className="flex flex-wrap gap-1.5">
                        {langList.map(([lang], i) => (
                          <button
                            key={lang}
                            onClick={() => selectLanguage(i)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${i === langIndex ? 'border-accent bg-accent/20 text-accent' : 'border-white/15 text-white/80 hover:bg-white/10'}`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentHosts.length > 1 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Server ({hostIndex + 1}/{currentHosts.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentHosts.map((h, i) => (
                          <button
                            key={h.host + i}
                            onClick={() => selectHost(i)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${i === hostIndex ? 'border-accent bg-accent/20 text-accent' : 'border-white/15 text-white/80 hover:bg-white/10'}`}
                          >
                            {h.host}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {resolvedOkRuUrl && okruVideos && okruVideos.length > 1 && (
                    <div className="mb-1">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Kualitas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {okruVideos.map((v, i) => (
                          <button
                            key={v.quality || i}
                            onClick={() => selectOkruQuality(i)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${i === okruQualityIndex ? 'border-accent bg-accent/20 text-accent' : 'border-white/15 text-white/80 hover:bg-white/10'}`}
                          >
                            {qualityLabel(v.quality, i)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {category === 'raw' && (
                    <div className="mt-2 rounded-lg border border-gold/40 bg-gold-soft/10 px-2.5 py-2 text-[11px] text-white/80">
                      <p className="font-bold text-white">Video tanpa teks (raw)</p>
                      <p className="mt-0.5 leading-snug text-white/60">
                        Gak ada subtitle bawaan. Download file .srt bahasa yang sesuai di bagian Unduh Episode,
                        lalu buka bareng video ini di VLC/MX Player.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
      </div>

      {!resolvedOkRuUrl && !loading && !exhausted && activeUrl && (
        <button
          onClick={manualSkip}
          className="mt-2 w-full rounded-lg border border-line bg-paper-card py-2 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent"
        >
          Video error / tidak muncul? Coba server lain →
        </button>
      )}
    </div>
  );
}
