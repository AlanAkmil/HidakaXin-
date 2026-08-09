import Link from 'next/link';
import webtoons from '../../../../lib/webtoonsScraper';

export const revalidate = 300;

// Cap at 20 pages (~200 episodes). We don't rely on hasNext because the
// HTML paginate selector is unreliable across Webtoons locale/layout changes.
// Instead we keep fetching until a page returns 0 new episodes (real end),
// or we hit the cap. Dedup by episodeNo guards against duplicate results if
// two pages somehow overlap.
const MAX_PAGES = 20;

async function getData(url) {
  try {
    let page = 1;
    let episodesList = [];
    let meta = null;
    const seen = new Set();

    while (page <= MAX_PAGES) {
      const d = await webtoons.episodes(url, page);
      if (!meta) meta = d;
      const newEps = (d.episodesList || []).filter((ep) => {
        const key = ep.episodeNo ?? ep.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (newEps.length === 0) break; // empty page = no more episodes
      episodesList = episodesList.concat(newEps);
      page++;
    }

    return { ...meta, episodesList: episodesList.sort((a, b) => (a.episodeNo || 0) - (b.episodeNo || 0)) };
  } catch {
    return null;
  }
}

export default async function WebtoonDetailPage({ params }) {
  const url = decodeURIComponent(params.slug);
  const d = await getData(url);

  if (!d) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Webtoon tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/komik" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Komik</Link>
      </div>
    );
  }

  const proxiedThumb = d.thumbnail ? `/api/komik/img?url=${encodeURIComponent(d.thumbnail)}` : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-xl border border-line shadow-card sm:max-w-none">
          {proxiedThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedThumb} alt={d.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-paper-soft text-ink-faint font-display text-4xl">?</div>
          )}
        </div>

        <div>
          <span className="mb-2 inline-block rounded-full bg-accent-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent">Webtoons</span>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{d.title}</h1>
          {d.author && <p className="mt-1 text-sm text-ink-faint">{d.author}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.status && <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent">{d.status}</span>}
            {d.rating && (
              <span className="flex items-center gap-1 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold">★ {d.rating}</span>
            )}
            {d.genre && <span className="rounded-full bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">{d.genre}</span>}
          </div>

          {d.day && <p className="mt-3 text-xs font-semibold text-ink-faint">{d.day}</p>}

          {d.synopsis && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft line-clamp-6">{d.synopsis}</p>
          )}
        </div>
      </div>

      {d.episodesList?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">
            Daftar Episode ({d.episodesList.length}{d.hasNext ? '+' : ''})
          </p>
          <div className="space-y-1.5">
            {d.episodesList.map((ep, i) => (
              <Link
                key={ep.url + i}
                href={`/komik/wt/${encodeURIComponent(ep.url)}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
              >
                <span className="font-semibold text-ink">{ep.title || `Episode ${ep.episodeNo}`}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
