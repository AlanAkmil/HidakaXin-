import Link from 'next/link';
import AnimeCard from '../../components/AnimeCard';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import scraper from '../../lib/scraper';
import sanka from '../../lib/sankaScraper';
import samehadaku from '../../lib/samehadakuScraper';
import anichin from '../../lib/anichinScraper';
import { getDonghuaSource } from '../../lib/donghuaSource';
import { getAnimeSource } from '../../lib/animeSource';
import { STUDIOS } from '../../lib/studios';
import { normalizeDonghua, normalizeAnichin, normalizeSanka, shuffleTogether } from '../../lib/normalize';
import MissionTrack from '../../components/MissionTrack';

const CARD_THEMES = [
  { bg: 'bg-paper-card', text: 'text-ink' },
  { bg: 'bg-[#e8e0c9]', text: 'text-[#3a331d]' },
  { bg: 'bg-[#f3ecd9]', text: 'text-[#3a331d]' }
];

const YEARS = Array.from({ length: 8 }).map((_, i) => new Date().getFullYear() - i);

async function getGenres() {
  try {
    return await scraper.genres();
  } catch {
    return null;
  }
}

async function getSearch(q, page) {
  const source = getDonghuaSource();
  const animeSource = getAnimeSource();
  const animeClient = animeSource === 'samehadaku' ? samehadaku : sanka;
  const [donghuaPayload, animePayload] = await Promise.all([
    source === 'anichin' ? anichin.search(q, page).catch(() => null) : scraper.search(q, page).catch(() => null),
    animeClient.search(q).catch(() => null)
  ]);

  const donghuaResults = source === 'anichin'
    ? (donghuaPayload?.items || []).map(normalizeAnichin)
    : (donghuaPayload?.data?.results || []).map(normalizeDonghua);
  const animeResults = (animePayload?.animeList || []).map((i) => normalizeSanka(i, animeSource));

  return {
    results: shuffleTogether(donghuaResults, animeResults),
    pagination: source === 'anichin' ? null : donghuaPayload?.data?.pagination || null
  };
}

function pathSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/genres\/|\/$/g, '');
  } catch {
    return '';
  }
}

export default async function CariPage({ searchParams }) {
  const q = searchParams?.q || '';
  const page = parseInt(searchParams?.page || '1');

  if (q) {
    const data = await getSearch(q, page);
    return (
      <div className="mx-auto max-w-3xl px-4 py-5">
        <MissionTrack event="search" />
        <SearchBar defaultValue={q} />
        <h1 className="mb-1 mt-4 font-display text-xl font-extrabold text-ink">
          Hasil untuk &ldquo;{q}&rdquo;
        </h1>
        <p className="mb-5 text-sm text-ink-soft">
          {data.results.length ? `${data.results.length} judul ditemukan.` : 'Tidak ada hasil.'}
        </p>

        {data.results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {data.results.map((item, i) => (
                <AnimeCard key={item.url + i} item={item} index={i} />
              ))}
            </div>
            <Pagination current={data.pagination?.current || page} total={data.pagination?.total} basePath="/cari" extraQuery={`&q=${encodeURIComponent(q)}`} />
          </>
        )}

        <Link href="/cari" className="mt-6 inline-block text-sm font-semibold text-accent">← Kembali jelajah kategori</Link>
      </div>
    );
  }

  const genresPayload = await getGenres();
  const genres = (genresPayload?.data?.genres || []).slice(0, 9);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <SearchBar defaultValue="" />

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-faint">Kategori</h2>
        <div className="space-y-3">
          {genres.map((g, i) => {
            const theme = CARD_THEMES[i % CARD_THEMES.length];
            return (
              <Link
                key={g.url}
                href={`/genre/${pathSlug(g.url)}`}
                className={`flex items-center justify-between overflow-hidden rounded-2xl border border-line px-5 py-6 shadow-card ${theme.bg}`}
              >
                <div>
                  <p className={`text-xs font-semibold ${theme.text} opacity-60`}>Genre</p>
                  <p className={`font-display text-xl font-extrabold ${theme.text}`}>{g.name}</p>
                </div>
                <span className={`font-display text-4xl font-black opacity-20 ${theme.text}`}>{g.name.slice(0, 1)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-faint">Studio</h2>
        </div>
        <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
          {STUDIOS.map((s) => (
            <Link
              key={s.url}
              href={`/studio/${encodeURIComponent(s.url)}`}
              className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-paper-card px-5 py-4 text-sm font-bold text-ink shadow-card transition hover:border-accent hover:text-accent"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 mb-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-faint">Tahun</h2>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {YEARS.map((y) => (
            <Link
              key={y}
              href={`/cari?q=${y}`}
              className="flex-shrink-0 rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft shadow-card hover:border-accent hover:text-accent"
            >
              {y}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
