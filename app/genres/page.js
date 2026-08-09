import Link from 'next/link';
import RevealOnView from '../../components/RevealOnView';
import MissionTrack from '../../components/MissionTrack';
import scraper from '../../lib/scraper';

export const revalidate = 3600;

async function getGenres() {
  try {
    return await scraper.genres();
  } catch {
    return null;
  }
}

function pathSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/genres\/|\/$/g, '');
  } catch {
    return '';
  }
}

export default async function GenresPage() {
  const payload = await getGenres();
  const genres = payload?.data?.genres || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <MissionTrack event="genre_browse" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Genre</h1>
      <p className="mb-6 text-sm text-ink-soft">Jelajahi donghua berdasarkan genre favorit kamu.</p>

      <div className="flex flex-wrap gap-2.5">
        {genres.map((g, i) => (
          <RevealOnView key={g.url} delay={(i % 16) * 25}>
            <Link
              href={`/genre/${pathSlug(g.url)}`}
              className="flex items-center gap-2 rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft shadow-card transition hover:border-accent hover:text-accent"
            >
              {g.name}
              <span className="rounded-full bg-paper-soft px-2 py-0.5 text-[11px] text-ink-faint">{g.count}</span>
            </Link>
          </RevealOnView>
        ))}
      </div>

      {genres.length === 0 && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat daftar genre.
        </p>
      )}
    </div>
  );
}
