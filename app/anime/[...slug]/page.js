import Link from 'next/link';
import RevealOnView from '../../../components/RevealOnView';
import FavoriteButton from '../../../components/FavoriteButton';
import scraper from '../../../lib/scraper';

export const revalidate = 300;

async function getDetail(slug) {
  try {
    return await scraper.detail(slug);
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

export default async function AnimeDetailPage({ params }) {
  const slug = params.slug.join('/');
  const payload = await getDetail(slug);
  const d = payload?.data;

  if (!d) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-ink-soft">Anime tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/daftar" className="mt-4 inline-block font-semibold text-accent">← Kembali ke koleksi</Link>
      </div>
    );
  }

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
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{d.title}</h1>
          {d.altTitle && <p className="mt-1 text-sm text-ink-faint">{d.altTitle}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.genres?.map((g) => (
              <span key={g} className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent">{g}</span>
            ))}
          </div>

          <div className="mt-4">
            <FavoriteButton item={{ url: payload.url, title: d.title, image: d.poster, type: d.type, rating: d.rating, source: 'donghua' }} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {d.status && <Info label="Status" value={d.status} />}
            {d.type && <Info label="Tipe" value={d.type} />}
            {d.episodes && <Info label="Episode" value={d.episodes} />}
            {d.released && <Info label="Rilis" value={d.released} />}
            {d.duration && <Info label="Durasi" value={d.duration} />}
            {d.network && (
              d.networkUrl ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Studio</dt>
                  <dd>
                    <Link href={`/studio/${encodeURIComponent(d.networkUrl)}`} className="text-accent hover:underline">
                      {d.network}
                    </Link>
                  </dd>
                </div>
              ) : (
                <Info label="Studio" value={d.network} />
              )
            )}
            {d.rating && <Info label="Rating" value={`★ ${d.rating}`} />}
          </dl>

          {d.synopsis && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-faint">Sinopsis</p>
              <p className="text-sm leading-relaxed text-ink-soft">{d.synopsis}</p>
            </div>
          )}
        </div>
      </div>

      {d.episodesList?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Daftar Episode</p>
          <div className="space-y-1.5">
            {d.episodesList.map((ep) => (
              <Link
                key={ep.url}
                href={`/watch/${pathSlug(ep.url)}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
              >
                <span className="font-semibold text-ink">{ep.title}</span>
                <span className="flex items-center gap-2 text-xs text-ink-faint">
                  {ep.date}
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent">{ep.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {d.recommended?.length > 0 && (
        <div className="mt-10">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Rekomendasi</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {d.recommended.map((r) => (
              <Link key={r.url} href={`/anime/${pathSlug(r.url)}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-lg border border-line bg-paper-soft shadow-card">
                  {r.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.poster} alt={r.title} className="h-full w-full object-cover transition group-hover:scale-105" />
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
