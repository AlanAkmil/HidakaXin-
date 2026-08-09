import Link from 'next/link';
import anichin from '../../../lib/anichinScraper';
import AnichinVideoPlayer from '../../../components/AnichinVideoPlayer';
import HistoryRecorder from '../../../components/HistoryRecorder';

export const revalidate = 120;

async function getEpisode(slug) {
  try {
    return await anichin.episode(slug);
  } catch {
    return null;
  }
}

export default async function WatchAcPage({ params }) {
  const slug = params.slug;
  const d = await getEpisode(slug);

  if (!d || (!d.defaultPlayer && !d.servers?.length)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Episode tidak ditemukan, atau field API-nya beda dari yang diasumsikan.</p>
        <p className="mt-1 text-xs text-ink-faint">Coba cek <code>/debug?test=anichin-episode&amp;slug={slug}</code> buat lihat data mentahnya.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <HistoryRecorder item={{ url: `https://anichin.local/${slug}`, title: d.title, image: d.seriesImage, source: 'anichin' }} />

      {d.seriesSlug && (
        <Link href={`/anime-ac/${d.seriesSlug}`} className="mb-3 inline-block text-sm text-ink-faint hover:text-accent">
          {d.seriesTitle || 'Kembali ke anime'}
        </Link>
      )}

      <h1 className="mb-4 font-display text-xl font-extrabold text-ink sm:text-2xl">{d.title}</h1>

      <AnichinVideoPlayer defaultPlayer={d.defaultPlayer} servers={d.servers} />

      {d.downloads?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Unduh Episode</p>
          <div className="space-y-3">
            {d.downloads.map((group, i) => (
              <div key={i} className="rounded-xl border border-line bg-paper-card p-4 shadow-card">
                <p className="mb-2 text-sm font-bold text-accent">{group.subtitle}</p>
                {group.unavailable ? (
                  <p className="text-xs text-ink-faint">Belum tersedia buat kualitas ini.</p>
                ) : (
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
