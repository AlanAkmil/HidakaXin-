import Link from 'next/link';
import { getMeioNovelDetail } from '../../../lib/meioNovelScraper';

export const revalidate = 900;

async function getNovel(slug) {
  try {
    return await getMeioNovelDetail(slug);
  } catch {
    return null;
  }
}

export default async function NovelDetailPage({ params }) {
  const novel = await getNovel(params.slug);

  if (!novel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Novel tidak ditemukan atau sumber sedang bermasalah.</p>
        <Link href="/novel" className="mt-4 inline-block font-semibold text-accent">
          ← Kembali ke daftar novel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="overflow-hidden rounded-xl border border-line shadow-card">
          {novel.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={novel.cover} alt={novel.title} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center bg-paper-soft text-4xl">📖</div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{novel.title}</h1>
          <p className="mt-1 text-sm text-ink-faint">{novel.author}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                novel.status === 'Completed' ? 'bg-gold-soft text-gold' : 'bg-accent-50 text-accent'
              }`}
            >
              {novel.status}
            </span>
            <span className="rounded-full bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">
              {novel.chapterCount} Chapter
            </span>
            {novel.source === 'meionovel' && (
              <span className="rounded-full bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">
                Sub Indo
              </span>
            )}
          </div>

          {novel.description && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-faint">Sinopsis</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{novel.description}</p>
            </div>
          )}
        </div>
      </div>

      {novel.partialChapterList && (
        <div className="mt-8 rounded-xl border border-line bg-paper-soft p-4">
          <p className="mb-1 text-sm font-bold text-ink">
            {novel.chapterCount ? `${novel.chapterCount} chapter tersedia` : 'Banyak chapter tersedia'}
          </p>
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Situs sumbernya gak nampilin daftar lengkap buat novel sepanjang ini — mulai baca dari sini, tombol
            Selanjutnya di halaman baca bakal nuntun ke chapter berikutnya satu-satu.
          </p>
          {novel.chapters[0] && (
            <Link
              href={
                novel.source === 'meionovel'
                  ? `/novel/baca/${novel.slug}/${novel.chapters[0].chapterPath}`
                  : `/novel/baca/${novel.slug}/${novel.chapters[0].slug}`
              }
              className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold text-white"
            >
              Mulai Baca →
            </Link>
          )}
        </div>
      )}

      {novel.chapters.length > 0 && !novel.partialChapterList && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Daftar Chapter</p>
          <div className="space-y-1.5">
            {novel.chapters.map((chapter, i) => {
              const chapterHref =
                novel.source === 'meionovel'
                  ? `/novel/baca/${novel.slug}/${chapter.chapterPath}`
                  : `/novel/baca/${novel.slug}/${chapter.slug}`;
              return (
                <Link
                  key={chapter.id || chapter.chapterPath || i}
                  href={chapterHref}
                  className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-2.5 text-sm shadow-card transition hover:border-accent"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent-50 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="line-clamp-1 font-semibold text-ink">{chapter.title}</span>
                  </span>
                  <span className="flex-shrink-0 text-ink-faint">→</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
