import Link from 'next/link';
import scraper from '../../../lib/scraper';
import AnimeXinVideoPlayer from '../../../components/AnimeXinVideoPlayer';
import HistoryRecorder from '../../../components/HistoryRecorder';

export const revalidate = 120;

async function getEpisode(slug) {
  try {
    return await scraper.episode(slug);
  } catch {
    return null;
  }
}

function pathSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return '';
  }
}

export default async function WatchPage({ params }) {
  const slug = params.slug.join('/');
  const payload = await getEpisode(slug);
  const d = payload?.data;

  if (!d) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-ink-soft">Episode tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/daftar" className="mt-4 inline-block font-semibold text-accent">← Kembali ke koleksi</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <HistoryRecorder item={{ url: payload.url, title: d.title, image: d.poster, sub: d.sub, type: d.type, source: 'donghua' }} />

      <nav className="mb-3 text-sm text-ink-faint">
        {d.seriesUrl && (
          <Link href={`/anime/${pathSlug(d.seriesUrl)}`} className="hover:text-accent">
            {d.seriesName || 'Kembali ke anime'}
          </Link>
        )}
      </nav>

      <h1 className="mb-4 font-display text-xl font-extrabold text-ink sm:text-2xl">{d.title}</h1>

      <AnimeXinVideoPlayer defaultPlayer={d.defaultPlayer} servers={d.servers} />

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        {d.prevEpisode ? (
          <Link href={`/watch/${pathSlug(d.prevEpisode)}`} className="text-sm font-semibold text-ink-soft hover:text-accent">
            ← Sebelumnya
          </Link>
        ) : <span />}
        {d.allEpisodesUrl && (
          <Link href={`/anime/${pathSlug(d.allEpisodesUrl)}`} className="text-sm font-bold text-accent">
            Semua Episode
          </Link>
        )}
        {d.nextEpisode ? (
          <Link href={`/watch/${pathSlug(d.nextEpisode)}`} className="text-sm font-semibold text-ink-soft hover:text-accent">
            Selanjutnya →
          </Link>
        ) : <span />}
      </div>

      {d.downloads?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Unduh Episode</p>
          <div className="space-y-3">
            {d.downloads.map((group, i) => (
              <div key={i} className="rounded-xl border border-line bg-paper-card p-4 shadow-card">
                <p className="mb-2 text-sm font-bold text-accent">{group.subtitle}</p>
                <div className="flex flex-wrap gap-2">
                  {group.links.map((l, j) => (
                    <a
                      key={j}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.otherEpisodes?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Rilisan Lain</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {d.otherEpisodes.map((e) => (
              <li key={e.url}>
                <Link href={`/watch/${pathSlug(e.url)}`} className="block truncate rounded-lg px-2 py-1 text-sm text-ink-soft hover:bg-paper-card hover:text-accent">
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
