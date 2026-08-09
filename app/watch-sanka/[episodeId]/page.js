import Link from 'next/link';
import sanka from '../../../lib/sankaScraper';
import SankaPlayer from '../../../components/SankaPlayer';
import HistoryRecorder from '../../../components/HistoryRecorder';

export const revalidate = 300;

async function getData(episodeId) {
  try {
    const episode = await sanka.episode(episodeId);
    // episode() doesn't include a poster — grab it from detail() so history
    // entries ("Lanjut Nonton") have a thumbnail instead of showing blank.
    const detail = episode?.animeId ? await sanka.detail(episode.animeId).catch(() => null) : null;
    return { episode, poster: detail?.poster || null };
  } catch {
    return { episode: null, poster: null };
  }
}

export default async function WatchSankaPage({ params }) {
  const episodeId = params.episodeId;
  const { episode: ep, poster } = await getData(episodeId);

  if (!ep) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Episode tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Beranda</Link>
      </div>
    );
  }

  const detailHref = `/anime-sanka/${ep.animeId}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <HistoryRecorder
        item={{
          url: ep.otakudesuUrl || `https://otakudesu.blog/episode/${episodeId}/`,
          title: ep.title,
          image: poster,
          source: 'sanka'
        }}
      />

      <Link href={detailHref} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
        Kembali ke detail
      </Link>

      <h1 className="mb-4 font-display text-xl font-extrabold text-ink sm:text-2xl">{ep.title}</h1>

      <SankaPlayer defaultUrl={ep.defaultStreamingUrl} qualities={ep.server?.qualities || []} />

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        {ep.hasPrevEpisode && ep.prevEpisode ? (
          <Link href={`/watch-sanka/${ep.prevEpisode.episodeId}`} className="text-sm font-semibold text-ink-soft hover:text-accent">← Sebelumnya</Link>
        ) : <span />}
        <Link href={detailHref} className="text-sm font-bold text-accent">Semua Episode</Link>
        {ep.hasNextEpisode && ep.nextEpisode ? (
          <Link href={`/watch-sanka/${ep.nextEpisode.episodeId}`} className="text-sm font-semibold text-ink-soft hover:text-accent">Selanjutnya →</Link>
        ) : <span />}
      </div>

      {ep.downloadUrl?.qualities?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Unduh Episode</p>
          <div className="space-y-3">
            {ep.downloadUrl.qualities.map((q) => (
              <div key={q.title} className="rounded-xl border border-line bg-paper-card p-4 shadow-card">
                <p className="mb-2 text-sm font-bold text-accent">{q.title.replace('_', ' ')} {q.size ? `(${q.size})` : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {q.urls.map((u) => (
                    <a
                      key={u.title}
                      href={u.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize text-ink-soft hover:border-accent hover:text-accent"
                    >
                      {u.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
