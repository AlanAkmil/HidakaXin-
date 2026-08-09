import Link from 'next/link';
import SearchBar from '../../components/SearchBar';
import MangaCard from '../../components/MangaCard';
import Pagination from '../../components/Pagination';
import MissionTrack from '../../components/MissionTrack';
import manga from '../../lib/mangaScraper';
import webtoons from '../../lib/webtoonsScraper';
import { normalizeWestmanhwa, normalizeWebtoon, shuffleTogether } from '../../lib/normalize';

export const revalidate = 300;

const TABS = [
  { value: '', label: 'Semua' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' }
];

async function getData(tipe, page) {
  if (tipe) {
    // A specific origin is selected — every item komiku.org returns for
    // this filter is guaranteed that type, so skip mixing in Webtoons here
    // (that's a separate origin with its own tag already).
    const west = await manga.list(tipe, page).catch(() => null);
    return { west, webtoon: null };
  }
  const [west, webtoon] = await Promise.all([
    manga.home(page).catch(() => null),
    webtoons.trending('daily').catch(() => null)
  ]);
  return { west, webtoon };
}

export default async function KomikPage({ searchParams }) {
  const page = parseInt(searchParams?.page || '1');
  const tipe = TABS.some((t) => t.value === searchParams?.tipe) ? searchParams.tipe : '';
  const { west, webtoon } = await getData(tipe, page);

  const merged = tipe
    ? (west?.items || []).map(normalizeWestmanhwa)
    : shuffleTogether((west?.items || []).map(normalizeWestmanhwa), (webtoon || []).map(normalizeWebtoon));

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <MissionTrack event="open_komik_page" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Komik</h1>
      <p className="mb-4 text-sm text-ink-soft">Baca manga, manhwa, manhua, & Webtoons favoritmu di sini.</p>

      <div className="mb-4">
        <SearchBar defaultValue="" action="/komik/cari" placeholder="Cari komik.." />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/komik?tipe=${t.value}` : '/komik'}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tipe === t.value ? 'bg-accent text-white' : 'border border-line bg-paper-card text-ink-soft'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!west && !webtoon && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat daftar komik. Coba lagi sebentar.
        </p>
      )}

      {merged.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {merged.map((item, i) => (
              <MangaCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
          <Pagination current={page} total={west?.next ? page + 1 : page} basePath="/komik" extraQuery={tipe ? `&tipe=${tipe}` : ''} />
        </>
      )}
    </div>
  );
}
