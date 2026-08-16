import Link from 'next/link';
import { shortLabel } from '../lib/normalize';

function slugFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return url.replace(/^\/|\/$/g, '');
  }
}

export default function JadwalCard({ item }) {
  const slug = slugFromUrl(item.url);
  const isAnichin = item.source === 'anichin';
  const isSanka = item.source === 'sanka';
  const isSamehadaku = item.source === 'samehadaku';
  const href = isAnichin
    ? `/anime-ac/${slug}`
    : isSamehadaku
    ? `/anime-same/${slug}`
    : isSanka
    ? `/anime-sanka/${slug}`
    : `/anime/${slug}`;
  const tag = item.genres?.[0] || null;
  const showTime = item.time && item.time !== item.episode;

  return (
    <Link href={href} className="block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-paper-soft shadow-card">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint font-display">?</div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-paper-card/90 px-2 py-0.5 text-[9px] font-bold uppercase text-ink-soft shadow">
          {isSamehadaku ? 'Samehadaku' : isSanka ? 'Anime' : isAnichin ? 'Anichin' : 'Donghua'}
        </span>
      </div>
      <div className="mt-2 px-0.5">
        {tag && <p className="mb-0.5 truncate text-[11px] font-semibold text-accent">{tag}</p>}
        <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{item.title}</p>
        <div className="mt-1 flex flex-col gap-1 text-[11px] font-medium">
          {item.episode && (
            <span className="flex items-center gap-1 text-ink-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5a36"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8Z" fill="#fff" /></svg>
              {shortLabel(item.episode)}
            </span>
          )}
          {showTime && (
            <span className="flex items-center gap-1 text-violet">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c5cff" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 3" />
              </svg>
              {item.time}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
