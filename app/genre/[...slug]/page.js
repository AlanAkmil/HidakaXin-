import AnimeCard from '../../../components/AnimeCard';
import Pagination from '../../../components/Pagination';
import MissionTrack from '../../../components/MissionTrack';
import scraper from '../../../lib/scraper';

export const revalidate = 300;

async function getGenre(slug, page) {
  try {
    return await scraper.genre(slug, page);
  } catch {
    return null;
  }
}

export default async function GenreDetailPage({ params, searchParams }) {
  const slug = params.slug.join('/');
  const page = parseInt(searchParams?.page || '1');
  const payload = await getGenre(slug, page);
  const data = payload?.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <MissionTrack event="genre_browse" />
      <h1 className="mb-5 font-display text-2xl font-extrabold text-ink capitalize">
        Genre: <span className="text-accent">{slug.replace(/-/g, ' ')}</span>
      </h1>

      {!data && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat data genre ini.
        </p>
      )}

      {data?.animeList?.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.animeList.map((item, i) => (
              <AnimeCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
          <Pagination current={data.pagination?.current || page} total={data.pagination?.total} basePath={`/genre/${slug}`} />
        </>
      )}
    </div>
  );
}
