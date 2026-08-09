import AnimeCard from '../../components/AnimeCard';
import Pagination from '../../components/Pagination';
import Link from 'next/link';
import scraper from '../../lib/scraper';

export const revalidate = 180;

const ORDERS = [
  { value: 'update', label: 'Update Terbaru' },
  { value: 'latest', label: 'Terbaru Rilis' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'rating', label: 'Rating Tertinggi' }
];

async function getList(order, page) {
  try {
    return await scraper.list(order, page);
  } catch {
    return null;
  }
}

export default async function DaftarPage({ searchParams }) {
  const order = searchParams?.order || 'update';
  const page = parseInt(searchParams?.page || '1');
  const payload = await getList(order, page);
  const data = payload?.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Koleksi Donghua</h1>
      <p className="mb-5 text-sm text-ink-soft">Semua judul, diperbarui berkala dari sumber.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {ORDERS.map((o) => (
          <Link
            key={o.value}
            href={`/daftar?order=${o.value}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              order === o.value
                ? 'border-accent bg-accent-50 text-accent'
                : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {!data && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat koleksi. Coba lagi sebentar.
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
            basePath="/daftar"
            extraQuery={`&order=${order}`}
          />
        </>
      )}

      {data && data.animeList?.length === 0 && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Belum ada judul di halaman ini.
        </p>
      )}
    </div>
  );
}
