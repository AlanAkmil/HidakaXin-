import Link from 'next/link';
import NovelCard from '../../components/NovelCard';
import MissionTrack from '../../components/MissionTrack';
import { getLatestMeioNovels } from '../../lib/meioNovelScraper';

export const revalidate = 900;

async function getNovels() {
  return getLatestMeioNovels({ limit: 24 }).catch(() => []);
}

export default async function NovelPage() {
  const novels = await getNovels();

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <MissionTrack event="open_novel_page" />
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Novel</h1>
          <p className="text-sm text-ink-soft">Baca novel sub Indo favoritmu, update tiap hari.</p>
        </div>
        <Link
          href="/novel/cari"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-paper-card text-ink-soft"
          aria-label="Cari novel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
        </Link>
      </div>

      {novels.length === 0 && (
        <div className="rounded-xl border border-line bg-paper-card p-8 text-center shadow-card">
          <p className="text-sm text-ink-soft">Gagal memuat novel. Coba refresh beberapa saat lagi.</p>
        </div>
      )}

      {novels.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {novels.map((novel, i) => (
            <NovelCard key={novel.id || i} item={novel} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
