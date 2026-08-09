import Link from 'next/link';
import anichin from '../../../lib/anichinScraper';
import FavoriteButton from '../../../components/FavoriteButton';

export const revalidate = 300;

async function getDetail(slug) {
  try {
    return await anichin.detail(slug);
  } catch {
    return null;
  }
}

export default async function AnichinDetailPage({ params }) {
  const slug = params.slug;
  const d = await getDetail(slug);

  if (!d || !d.title || d.title === 'Tanpa Judul') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Donghua tidak ditemukan, atau field API-nya beda dari yang diasumsikan.</p>
        <p className="mt-1 text-xs text-ink-faint">Coba cek <code>/debug?test=anichin-detail&amp;slug={slug}</code> buat lihat data mentahnya.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-accent">← Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-xl border border-line shadow-card">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt={d.title} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center bg-paper-soft text-ink-faint font-display text-4xl">?</div>
          )}
        </div>

        <div>
          <span className="mb-2 inline-block rounded-full bg-accent-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent">Anichin</span>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{d.title}</h1>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.status && <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent">{d.status}</span>}
            {d.genres?.map((g) => (
              <span key={g} className="rounded-full bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">{g}</span>
            ))}
          </div>

          <div className="mt-4">
            <FavoriteButton item={{ url: `https://anichin.local/${slug}`, title: d.title, image: d.image, source: 'anichin' }} />
          </div>

          {d.synopsis && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{d.synopsis}</p>}
        </div>
      </div>

      {d.episodesList?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Daftar Episode ({d.episodesList.length})</p>
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {d.episodesList.map((ep, i) => (
              <Link
                key={ep.slug + i}
                href={`/watch-ac/${ep.slug}`}
                className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
              >
                <span className="font-semibold text-ink">{ep.title}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {d.recommended?.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Rekomendasi</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {d.recommended.map((r, i) => (
              <Link key={r.slug + i} href={`/anime-ac/${r.slug}`} className="group">
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
