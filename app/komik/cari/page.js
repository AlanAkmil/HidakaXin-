import SearchBar from '../../../components/SearchBar';
import MangaCard from '../../../components/MangaCard';
import manga from '../../../lib/mangaScraper';
import webtoons from '../../../lib/webtoonsScraper';
import { normalizeWestmanhwa, normalizeWebtoon, shuffleTogether } from '../../../lib/normalize';

async function getSearch(q) {
  const [westPayload, wtItems] = await Promise.all([
    manga.search(q).catch(() => null),
    webtoons.search(q).catch(() => [])
  ]);
  return {
    results: shuffleTogether(
      (westPayload?.items || []).map(normalizeWestmanhwa),
      (wtItems || []).map(normalizeWebtoon)
    )
  };
}

export default async function KomikSearchPage({ searchParams }) {
  const q = searchParams?.q || '';
  const data = q ? await getSearch(q) : { results: [] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <SearchBar defaultValue={q} action="/komik/cari" placeholder="Cari komik.." />
      <h1 className="mb-1 mt-4 font-display text-xl font-extrabold text-ink">Hasil untuk &ldquo;{q}&rdquo;</h1>
      <p className="mb-5 text-sm text-ink-soft">{data.results.length ? `${data.results.length} judul ditemukan.` : 'Tidak ada hasil.'}</p>

      {data.results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {data.results.map((item, i) => (
            <MangaCard key={item.url + i} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}