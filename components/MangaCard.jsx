import Link from 'next/link';
import RevealOnView from './RevealOnView';

export default function MangaCard({ item, index = 0 }) {
  const cover = item.image || item.cover || null;
  const isWebtoon = item.source === 'webtoons';
  const proxiedCover = isWebtoon && cover ? `/api/komik/img?url=${encodeURIComponent(cover)}` : cover;
  const href = isWebtoon ? `/komik/wt-detail/${encodeURIComponent(item.url)}` : `/komik/${item.slug}`;

  return (
    <RevealOnView delay={(index % 12) * 35}>
      <Link href={href} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-paper-soft shadow-card">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedCover} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint font-display">?</div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-paper-card/90 px-2 py-0.5 text-[9px] font-bold uppercase text-ink-soft shadow">
            {isWebtoon ? 'Webtoons' : item.type || 'Komik'}
          </span>
        </div>
        <div className="mt-2 px-0.5">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{item.title}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-ink-soft">
            {item.chapter && <span>{item.chapter}</span>}
            {item.rating && (
              <span className="flex items-center gap-1 text-gold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f2a900"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2Z" /></svg>
                {item.rating}
              </span>
            )}
          </div>
        </div>
      </Link>
    </RevealOnView>
  );
}
