import Link from 'next/link';
import webtoons from '../../../../lib/webtoonsScraper';
import RetryImage from '../../../../components/RetryImage';
import KomikHistoryRecorder from '../../../../components/KomikHistoryRecorder';
import TapToScroll from '../../../../components/TapToScroll';

export const revalidate = 300;

async function getData(url) {
  try {
    return await webtoons.episodeImages(url);
  } catch {
    return null;
  }
}

function proxied(url) {
  return `/api/komik/img?url=${encodeURIComponent(url)}`;
}

// Webtoons episode URLs carry an "episode_no=" query param — best-effort
// label for the continue-reading card subtitle, since episodeImages()
// itself doesn't return a separate episode number.
function episodeLabelFromUrl(url) {
  try {
    const n = new URL(url).searchParams.get('episode_no');
    return n ? `Episode ${n}` : null;
  } catch {
    return null;
  }
}

export default async function WebtoonReaderPage({ params }) {
  const url = decodeURIComponent(params.slug);
  const data = await getData(url);
  const images = data?.images || [];

  return (
    <div className="mx-auto max-w-2xl px-0 py-0 sm:px-4 sm:py-5">
      <KomikHistoryRecorder
        item={{
          chapterUrl: url,
          title: data?.title || 'Webtoons',
          cover: data?.thumbnail ? proxied(data.thumbnail) : null,
          chapterLabel: episodeLabelFromUrl(url),
          readHref: `/komik/wt/${encodeURIComponent(url)}`
        }}
      />

      <div className="sticky top-[52px] z-20 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:rounded-xl sm:border">
        <Link href="/komik" className="flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
          Kembali
        </Link>
      </div>

      {images.length === 0 && (
        <div className="mx-4 mt-6 rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          <p>Gagal memuat halaman chapter ini.</p>
          <p className="mt-1 text-xs text-ink-faint">
            Bisa jadi episode premium/butuh login di Webtoons, atau sumbernya lagi bermasalah.
          </p>
          <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent">
            Buka di Webtoons.com →
          </a>
        </div>
      )}

      <TapToScroll>
        <div className="flex flex-col">
          {images.map((src, i) => (
            <RetryImage key={i} src={proxied(src)} alt={`Halaman ${i + 1}`} index={i + 1} className="w-full" />
          ))}
        </div>
      </TapToScroll>
    </div>
  );
}
