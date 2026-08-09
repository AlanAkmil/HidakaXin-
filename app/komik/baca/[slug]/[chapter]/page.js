import Link from 'next/link';
import manga, { slugFromChapterUrl } from '../../../../../lib/mangaScraper';
import RetryImage from '../../../../../components/RetryImage';
import TapToScroll from '../../../../../components/TapToScroll';
import KomikHistoryRecorder from '../../../../../components/KomikHistoryRecorder';

async function getRead(chapter) {
  try {
    return await manga.read(chapter);
  } catch {
    return null;
  }
}

async function getDetail(slug) {
  try {
    return await manga.detail(slug);
  } catch {
    return null;
  }
}

export default async function KomikReaderPage({ params }) {
  const { slug, chapter } = params;
  const [data, detail] = await Promise.all([getRead(chapter), getDetail(slug)]);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Gagal memuat chapter ini.</p>
        <Link href={`/komik/${slug}`} className="mt-4 inline-block font-semibold text-accent">← Kembali</Link>
      </div>
    );
  }

  const prevSlug = data.prevUrl ? slugFromChapterUrl(data.prevUrl) : null;
  const nextSlug = data.nextUrl ? slugFromChapterUrl(data.nextUrl) : null;
  const chapterLabel = detail?.chapters?.find((c) => c.slug === chapter)?.label || chapter.replace(/-/g, ' ');

  return (
    <div className="mx-auto max-w-2xl px-0 py-0 sm:px-4 sm:py-5">
      <KomikHistoryRecorder
        item={{
          chapterUrl: `${slug}/${chapter}`,
          komikSlug: slug,
          chapterSlug: chapter,
          title: detail?.title || slug,
          cover: detail?.cover || null,
          chapterLabel,
          readHref: `/komik/baca/${slug}/${chapter}`
        }}
      />

      <div className="sticky top-[52px] z-20 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:rounded-xl sm:border">
        <Link href={`/komik/${slug}`} className="flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
          Semua Chapter
        </Link>
      </div>

      {data.images.length === 0 && (
        <p className="mx-4 mt-6 rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat halaman chapter ini. Sumbernya mungkin lagi bermasalah.
        </p>
      )}

      <TapToScroll>
        <div className="flex flex-col">
          {data.images.map((url, i) => (
            <RetryImage key={i} src={`/api/komik/img?url=${encodeURIComponent(url)}`} alt={`Halaman ${i + 1}`} index={i + 1} className="w-full" />
          ))}
        </div>
      </TapToScroll>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-5">
        {prevSlug ? (
          <Link href={`/komik/baca/${slug}/${prevSlug}`} className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent">
            ← Sebelumnya
          </Link>
        ) : <span />}
        <Link href={`/komik/${slug}`} className="text-sm font-bold text-accent">Semua Chapter</Link>
        {nextSlug ? (
          <Link href={`/komik/baca/${slug}/${nextSlug}`} className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent">
            Selanjutnya →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
