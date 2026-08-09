'use client';

import { useState } from 'react';

// `qualities` shape (from sankaScraper.episode().server.qualities):
// [{ title: '360p', serverList: [{ title: 'filedon', serverId, href }, ...] }, ...]
export default function SankaPlayer({ defaultUrl, qualities = [] }) {
  const [activeUrl, setActiveUrl] = useState(defaultUrl);
  const [activeServerId, setActiveServerId] = useState(null);
  const [loadingServerId, setLoadingServerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function selectServer(serverId) {
    if (serverId === activeServerId || loadingServerId) return;
    setLoadingServerId(serverId);
    setError(false);
    try {
      const res = await fetch(`/api/sanka-server?id=${encodeURIComponent(serverId)}`);
      const data = await res.json();
      if (data?.url) {
        setActiveUrl(data.url);
        setActiveServerId(serverId);
        setLoading(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoadingServerId(null);
    }
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black shadow-card">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center">
            <p className="text-sm font-semibold text-white">Server ini gagal dimuat.</p>
            <p className="text-xs text-white/60">Coba pilih server lain di bawah.</p>
          </div>
        )}
        {activeUrl ? (
          <iframe
            key={activeUrl}
            src={activeUrl}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/50">Player tidak tersedia</div>
        )}
      </div>

      {qualities.length > 0 && (
        <div className="mt-4 space-y-3">
          {qualities.map((q) => (
            <div key={q.title}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">{q.title}</p>
              <div className="flex flex-wrap gap-2">
                {q.serverList.map((s) => (
                  <button
                    key={s.serverId}
                    onClick={() => selectServer(s.serverId)}
                    disabled={loadingServerId === s.serverId}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      activeServerId === s.serverId
                        ? 'border-accent bg-accent-50 text-accent'
                        : 'border-line text-ink-soft hover:border-accent hover:text-accent'
                    }`}
                  >
                    {loadingServerId === s.serverId ? '...' : s.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
