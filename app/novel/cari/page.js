import SearchBar from '../../../components/SearchBar';
import NovelCard from '../../../components/NovelCard';
import { searchMeioNovels } from '../../../lib/meioNovelScraper';

async function getSearch(q) {
  return searchMeioNovels(q, { limit: 30 }).catch(() => []);
}

export default async function NovelSearchPage({ searchParams }) {
  const q = searchParams?.q || '';
  const results = q ? await getSearch(q) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <SearchBar defaultValue={q} action="/novel/cari" placeholder="Cari novel.." />
      <h1 className="mb-1 mt-4 font-display text-xl font-extrabold text-ink">Hasil untuk &ldquo;{q}&rdquo;</h1>
      <p className="mb-5 text-sm text-ink-soft">
        {results.length ? `${results.length} novel ditemukan.` : q ? 'Tidak ada hasil.' : 'Ketik judul, tag, atau kata kunci.'}
      </p>

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {results.map((novel, i) => (
            <NovelCard key={novel.id || i} item={novel} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
