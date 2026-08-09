import Link from 'next/link';
import manga from '../../../lib/mangaScraper';

export const revalidate = 300;

async function getDetail(slug) {
  try {
    return await manga.detail(slug);
  } catch {
    return null;
  }
}

export default async function KomikDetailPage({ params }) {
  const slug = params.slug;
  const d = await getDetail(slug);

  if (!d) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Komik tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/komik" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Komik</Link>
      </div>
    );
  }

  const cover = d.cover || null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-xl border border-line shadow-card">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={d.title} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center bg-paper-soft text-ink-faint font-display text-4xl">?</div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{d.title}</h1>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.type && <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">{d.type}</span>}
            {d.status && <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent">{d.status}</span>}
            {d.rating && (
              <span className="flex items-center gap-1 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold">
                ★ {d.rating}
              </span>
            )}
            {d.genres?.map((g) => (
              <span key={g} className="rounded-full bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">{g}</span>
            ))}
          </div>

          {d.synopsis && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft line-clamp-6">{d.synopsis}</p>
          )}
        </div>
      </div>

      {d.chapters?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Daftar Chapter ({d.chapters.length})</p>
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {[...d.chapters].reverse().map((ch, i) => (
              <Link
                key={ch.slug + i}
                href={`/komik/baca/${slug}/${ch.slug}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
              >
                <span className="font-semibold text-ink">{ch.label}</span>
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
