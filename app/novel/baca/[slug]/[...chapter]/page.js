import Link from 'next/link';
import { scrapeMeioChapter, getMeioNovelDetail, meioChapterPathFromUrl } from '../../../../../lib/meioNovelScraper';
import NovelHistoryRecorder from '../../../../../components/NovelHistoryRecorder';

async function getChapter(slug, chapterSegments) {
  const chapterPath = chapterSegments.join('/');
  try {
    const [data, novel] = await Promise.all([
      scrapeMeioChapter(slug, chapterPath),
      getMeioNovelDetail(slug).catch(() => null)
    ]);
    const prev = data.prevUrl ? meioChapterPathFromUrl(data.prevUrl) : null;
    const next = data.nextUrl ? meioChapterPathFromUrl(data.nextUrl) : null;
    return {
      title: data.title,
      storyTitle: novel?.title || '',
      cover: novel?.cover || '',
      content: data.content,
      prevHref: prev ? `/novel/baca/${prev.slug}/${prev.chapterPath}` : null,
      nextHref: next ? `/novel/baca/${next.slug}/${next.chapterPath}` : null
    };
  } catch {
    return null;
  }
}

export default async function NovelReaderPage({ params }) {
  const { slug, chapter } = params; // chapter is an array (catch-all segments)
  const data = await getChapter(slug, chapter);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">Gagal memuat chapter ini.</p>
        <Link href={`/novel/${slug}`} className="mt-4 inline-block font-semibold text-accent">
          ← Kembali
        </Link>
      </div>
    );
  }

  const paragraphs = data.content ? data.content.split('\n\n').filter((p) => p.trim()) : [];

  return (
    <div className="min-h-screen bg-paper">
      <NovelHistoryRecorder
        item={{
          chapterUrl: `${slug}/${chapter.join('/')}`,
          novelSlug: slug,
          chapterSlug: chapter.join('/'),
          title: data.storyTitle || slug,
          cover: data.cover || null,
          chapterTitle: data.title,
          readHref: `/novel/baca/${slug}/${chapter.join('/')}`
        }}
      />

        {/* Hero — cover image with title overlaid, WattPad-style */}
        <div className="relative flex h-56 items-end overflow-hidden bg-ink sm:h-72">
          {data.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.cover} alt={data.storyTitle} className="absolute inset-0 h-full w-full object-cover opacity-60" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

          <Link
            href={`/novel/${slug}`}
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
            aria-label="Kembali ke daftar chapter"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
            </svg>
          </Link>

          <div className="relative z-10 px-5 pb-5">
            {data.storyTitle && (
              <p className="mb-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white sm:text-3xl">
                {data.storyTitle}
              </p>
            )}
            <p className="text-sm font-semibold text-white/80">{data.title}</p>
          </div>
        </div>

        <article className="mx-auto max-w-2xl px-5 py-8">
          {paragraphs.length === 0 ? (
            <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card dark:border-white/10 dark:bg-paper-card/5 dark:text-white/60">
              Gagal memuat isi chapter ini. Sumbernya mungkin lagi bermasalah.
            </p>
          ) : (
            <div className="font-display text-[17px] leading-[1.9] text-ink dark:text-white/85">
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="mb-5 text-justify">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </article>

        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 border-t border-line px-5 py-6 dark:border-white/10">
          {data.prevHref ? (
            <Link
              href={data.prevHref}
              className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent dark:border-white/15 dark:bg-paper-card/5 dark:text-white/70"
            >
              ← Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <Link href={`/novel/${slug}`} className="text-sm font-bold text-accent">
            Daftar Chapter
          </Link>
          {data.nextHref ? (
            <Link
              href={data.nextHref}
              className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent dark:border-white/15 dark:bg-paper-card/5 dark:text-white/70"
            >
              Selanjutnya →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
  );
}
