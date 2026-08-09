import Link from 'next/link';
import RevealOnView from '../../../components/RevealOnView';
import sanka from '../../../lib/sankaScraper';

export const revalidate = 300;

async function getData(animeId) {
  try {
    const detail = await sanka.detail(animeId);
    return { detail };
  } catch {
    return { detail: null };
  }
}

export default async function AnimeSankaDetailPage({ params }) {
  const animeId = params.slug;
  const { detail: d } = await getData(animeId);

  if (!d) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Anime tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Beranda</Link>
      </div>
    );
  }

  const sortedEpisodes = [...(d.episodeList || [])].sort((a, b) => (a.eps || 0) - (b.eps || 0));
  const synopsis = d.synopsis?.paragraphs?.join('\n\n');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <RevealOnView>
          <div className="overflow-hidden rounded-xl border border-line shadow-card">
            {d.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.poster} alt={d.title} className="w-full object-cover" />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center bg-paper-soft text-ink-faint font-display text-4xl">?</div>
            )}
          </div>
        </RevealOnView>

        <div>
          <span className="mb-2 inline-block rounded-full bg-accent-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent">Anime</span>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{d.title}</h1>
          {d.japanese && <p className="mt-1 text-sm text-ink-faint">{d.japanese}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.genreList?.map((g) => (
              <span key={g.genreId} className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent">{g.title}</span>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {d.status && <Info label="Status" value={d.status} />}
            {d.type && <Info label="Tipe" value={d.type} />}
            {d.aired && <Info label="Rilis" value={d.aired} />}
            {d.duration && <Info label="Durasi" value={d.duration} />}
            {d.studios && <Info label="Studio" value={d.studios} />}
            {d.score && <Info label="Rating" value={`★ ${d.score}`} />}
            {d.producers && <Info label="Produser" value={d.producers} />}
          </dl>

          {synopsis && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-faint">Sinopsis</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{synopsis}</p>
            </div>
          )}
        </div>
      </div>

      {sortedEpisodes.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Daftar Episode ({sortedEpisodes.length})</p>
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {sortedEpisodes.map((ep) => (
              <Link
                key={ep.episodeId}
                href={`/watch-sanka/${ep.episodeId}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
              >
                <span className="font-semibold text-ink">{ep.title || `Episode ${ep.eps}`}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {d.recommendedAnimeList?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Rekomendasi</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {d.recommendedAnimeList.map((r) => (
              <Link key={r.animeId} href={`/anime-sanka/${r.animeId}`} className="group">
                <div className="overflow-hidden rounded-xl border border-line bg-paper-soft shadow-card">
                  {r.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.poster}
                      alt={r.title}
                      className="aspect-[2/3] w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center text-ink-faint font-display text-2xl">?</div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-semibold text-ink">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className="text-ink-soft">{value}</dd>
    </div>
  );
}
