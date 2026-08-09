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

export default function AnimeRow({ item, watchMode = false }) {
  const isWebtoons = item.source === 'webtoons';
  const slug = slugFromUrl(item.url);
  const isAnichin = item.source === 'anichin';
  const isSanka = item.source === 'sanka';
  const href = isWebtoons
    ? item.url
    : isAnichin
    ? (watchMode ? `/watch-ac/${slug}` : `/anime-ac/${slug}`)
    : isSanka
    ? (watchMode ? `/watch-sanka/${slug}` : `/anime-sanka/${slug}`)
    : (watchMode ? `/watch/${slug}` : `/anime/${slug}`);
  const tag = item.genres?.[0] || item.type || null;

  return (
    <Link
      href={href}
      target={isWebtoons ? '_blank' : undefined}
      rel={isWebtoons ? 'noreferrer' : undefined}
      className="flex w-64 flex-shrink-0 gap-3 rounded-xl border border-line bg-paper-card p-2 shadow-card sm:w-72"
    >
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-paper-soft">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {tag && <p className="truncate text-[11px] font-semibold text-accent">{tag}</p>}
        <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{item.title}</p>
        <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-ink-soft">
          {(item.episode || item.status) && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5a36"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8Z" fill="#fff" /></svg>
              {shortLabel(item.episode || item.status)}
            </span>
          )}
          {item.rating && (
            <span className="flex items-center gap-1 text-gold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f2a900"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2Z" /></svg>
              {item.rating}
            </span>
          )}
          <span className="ml-auto rounded-full bg-paper-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-faint">
            {isWebtoons ? 'Webtoon' : isSanka ? 'Anime' : isAnichin ? 'Anichin' : 'Donghua'}
          </span>
        </div>
      </div>
    </Link>
  );
}
