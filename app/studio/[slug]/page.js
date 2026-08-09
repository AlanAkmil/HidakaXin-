import Link from 'next/link';
import AnimeCard from '../../../components/AnimeCard';
import Pagination from '../../../components/Pagination';
import scraper from '../../../lib/scraper';
import { STUDIOS } from '../../../lib/studios';

export default async function StudioPage({ params, searchParams }) {
  const raw = decodeURIComponent(params.slug);
  const isRealUrl = /^https?:\/\//.test(raw);
  const page = parseInt(searchParams?.page || '1');

  let displayName = raw;
  let data = null;
  let accurate = false;

  if (isRealUrl) {
    // Came from a real scraped studio archive link (either the anime detail
    // page's "Studio" field, or the /cari studio row when the source has a
    // studio taxonomy) — this is 100% accurate, not a guess.
    try {
      const payload = await scraper.studioDetail(raw, page);
      data = payload?.data;
      accurate = true;
    } catch {
      data = null;
    }
    // try to recover a nicer display name from the curated list, else use the URL's slug
    const bySlugGuess = raw.split('/').filter(Boolean).pop()?.replace(/-/g, ' ');
    displayName = bySlugGuess ? bySlugGuess.replace(/\b\w/g, (c) => c.toUpperCase()) : raw;
  } else {
    // Plain studio name with no known real archive link — best-effort text search.
    try {
      const payload = await scraper.search(raw, page);
      data = payload?.data ? { animeList: payload.data.results, pagination: payload.data.pagination } : null;
    } catch {
      data = null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <Link href="/cari" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
        Kembali
      </Link>

      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">{displayName}</h1>
      <p className="mb-5 text-sm text-ink-soft">
        {accurate
          ? (data?.animeList?.length ? `${data.animeList.length} judul dari studio ini.` : 'Donghua produksi studio ini.')
          : 'Hasil perkiraan (pencarian teks, sering nggak nemu apa-apa). Cara paling akurat: buka detail anime mana pun → ketuk nama studionya di situ.'}
      </p>

      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {STUDIOS.map((s) => (
          <Link
            key={s.url}
            href={`/studio/${encodeURIComponent(s.url)}`}
            className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              s.url === raw ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {!data && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat data. Coba lagi sebentar.
        </p>
      )}

      {data?.animeList?.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.animeList.map((item, i) => (
              <AnimeCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
          <Pagination
            current={data.pagination?.current || page}
            total={data.pagination?.total}
            basePath={`/studio/${encodeURIComponent(raw)}`}
          />
        </>
      )}

      {data && data.animeList?.length === 0 && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Belum ada judul yang cocok untuk studio ini di sumber kami.
        </p>
      )}
    </div>
  );
}
