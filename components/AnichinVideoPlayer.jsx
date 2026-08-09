'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function isOkRu(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === 'ok.ru';
  } catch {
    return false;
  }
}

// Some episodes give a wrapper URL from Anichin's own player domain instead
// of a direct ok.ru link, e.g.
// "https://anichin-player.web.id/index.php?ok=15342286539442" — the `ok=`
// query param looks like an OK.ru video ID (same numeric shape as the ones
// seen directly, e.g. ok.ru/videoembed/9946755959474). This is a guess
// based on that pattern, not confirmed against the wrapper page's actual
// markup (couldn't fetch it to verify) — if wrong, okru-extract will just
// fail cleanly with a real error instead of silently breaking.
function resolveOkRuUrl(url) {
  if (isOkRu(url)) return url;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'anichin-player.web.id') {
      const id = u.searchParams.get('ok');
      if (id) return `https://ok.ru/videoembed/${id}`;
    }
  } catch {
    // ignore, falls through to null
  }
  return null;
}

function toEmbeddable(url) {
  if (!url) return null;
  try {
    new URL(url); // just validating it's an absolute URL
    return `/api/embed-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

// Preferred default quality when OK.ru's extraction succeeds — "sd" is a
// reasonable middle ground for mobile data. Falls back to the middle of
// whatever list comes back if "sd" isn't present.
function pickDefaultQualityIndex(videos) {
  const idx = videos.findIndex((v) => v.quality === 'sd');
  return idx >= 0 ? idx : Math.floor(videos.length / 2);
}

// OK.ru's own quality tags aren't resolution numbers — this is the standard
// tag→resolution mapping used by other OK.ru extractors (not present in
// OK.ru's own response data, so treat as a strong convention rather than
// confirmed-from-source).
const QUALITY_LABELS = {
  mobile: '144p',
  lowest: '240p',
  low: '360p',
  sd: '480p',
  hd: '720p',
  full: '1080p'
};

function qualityLabel(quality, index) {
  return QUALITY_LABELS[quality] || quality || `Kualitas ${index + 1}`;
}

export default function AnichinVideoPlayer({ defaultPlayer, servers = [] }) {
  const validServers = useMemo(() => servers.filter((s) => s?.url), [servers]);

  // No server picker for Anichin — auto-pick the best option instead:
  // every OK.ru-resolvable server first (custom player, ad-free), then
  // whatever's left as a last-resort iframe fallback. serverIndex just
  // walks this queue silently on failure; nothing about it is shown.
  const autoQueue = useMemo(() => {
    const okru = validServers.filter((s) => resolveOkRuUrl(s.url));
    const rest = validServers.filter((s) => !resolveOkRuUrl(s.url));
    return [...okru, ...rest];
  }, [validServers]);

  const [serverIndex, setServerIndex] = useState(0);
  const current = autoQueue[serverIndex] || (defaultPlayer ? { label: 'Default', url: defaultPlayer } : null);
  const resolvedOkRuUrl = current ? resolveOkRuUrl(current.url) : null;
  const currentIsOkRu = !!resolvedOkRuUrl;

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
    fetch(`/api/okru-extract?url=${encodeURIComponent(resolvedOkRuUrl)}`)
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

  function nextServer() {
    if (autoQueue.length > 1) {
      setServerIndex((i) => (i + 1) % autoQueue.length);
    }
  }

  const iframeSrc = current && !currentIsOkRu ? toEmbeddable(current.url) : null;
  const activeOkruVideo = okruVideos?.[okruQualityIndex];

  // MediaError.code is a plain number (1-4) with no message of its own —
  // map it to something readable so a failure shows real info instead of
  // just a broken-image icon with no explanation.
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
    setQualityMenuOpen(false);
  }

  const containerRef = useRef(null);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }

  return (
    <div>
      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-line bg-black shadow-card">
        <div className="aspect-video">
          {!current ? (
            <div className="flex h-full items-center justify-center text-white/50">Player tidak tersedia</div>
          ) : currentIsOkRu ? (
            okruLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-white/60">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                Ngambil link video dari OK.ru...
              </div>
            ) : activeOkruVideo ? (
              <>
                <video
                  key={activeOkruVideo.url}
                  src={`/api/okru-stream?url=${encodeURIComponent(activeOkruVideo.url)}`}
                  controls
                  controlsList="nofullscreen"
                  autoPlay
                  muted
                  playsInline
                  onError={handleVideoError}
                  onCanPlay={() => setOkruPlaybackError(null)}
                  className="h-full w-full bg-black"
                />

                {/* Custom gear (quality) + fullscreen overlay — native <video>
                    fullscreen only fullscreens the <video> element itself,
                    which would hide this overlay. We fullscreen the wrapper
                    div instead (via toggleFullscreen) so the quality menu
                    stays reachable in fullscreen too. */}
                <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
                  {okruVideos && okruVideos.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setQualityMenuOpen((v) => !v)}
                        aria-label="Pilih kualitas"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                        </svg>
                      </button>
                      {qualityMenuOpen && (
                        <div className="absolute right-0 top-9 min-w-[100px] overflow-hidden rounded-lg border border-white/10 bg-black/90 py-1 backdrop-blur">
                          {okruVideos.map((v, i) => (
                            <button
                              key={v.quality || i}
                              onClick={() => selectOkruQuality(i)}
                              className={`block w-full px-3 py-1.5 text-left text-xs font-semibold ${
                                i === okruQualityIndex ? 'text-accent' : 'text-white/80 hover:bg-white/10'
                              }`}
                            >
                              {qualityLabel(v.quality, i)}
                              {i === okruQualityIndex ? ' ✓' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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

                {okruPlaybackError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center">
                    <p className="text-sm font-semibold text-white">Video gagal dimuat</p>
                    <p className="max-w-xs break-words text-xs text-white/60">{okruPlaybackError}</p>
                    {autoQueue.length > 1 && (
                      <button
                        onClick={nextServer}
                        className="mt-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-accent hover:text-accent"
                      >
                        Coba lagi →
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <p className="text-sm text-white/70">{okruError || 'Gagal muat video dari OK.ru'}</p>
                {autoQueue.length > 1 && (
                  <button
                    onClick={nextServer}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-accent hover:text-accent"
                  >
                    Coba lagi →
                  </button>
                )}
              </div>
            )
          ) : iframeSrc ? (
            <iframe
              src={iframeSrc}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">Player tidak tersedia</div>
          )}
        </div>
      </div>
      {/* Server picker removed on purpose — Anichin auto-picks the best
          available server (OK.ru custom player first, iframe fallback if
          none work) instead of making the user choose. */}
    </div>
  );
}