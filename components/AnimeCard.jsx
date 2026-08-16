import Link from 'next/link';
import RevealOnView from './RevealOnView';
import { shortLabel } from '../lib/normalize';

function slugFromUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/|\/$/g, '');
  } catch {
    return url.replace(/^\/|\/$/g, '');
  }
}

/**
 * Standard portrait anime/donghua card. Works for either source — routes to
 * the donghua (AnimeXin) or anime (Nimegami) detail/watch pages depending on
 * item.source, so the two can be freely mixed in the same grid.
 */
export default function AnimeCard({ item, index = 0, watchMode = false }) {
  const isWebtoons = item.source === 'webtoons';
  const slug = slugFromUrl(item.url);
  const isAnichin = item.source === 'anichin';
  const isSanka = item.source === 'sanka';
  const isSamehadaku = item.source === 'samehadaku';
  const href = isWebtoons
    ? item.url // full external webtoons.com URL — not an internal slug
    : isAnichin
    ? (watchMode ? `/watch-ac/${slug}` : `/anime-ac/${slug}`)
    : isSamehadaku
    ? (watchMode ? `/watch-same/${slug}` : `/anime-same/${slug}`)
    : isSanka
    ? (watchMode ? `/watch-sanka/${slug}` : `/anime-sanka/${slug}`)
    : (watchMode ? `/watch/${slug}` : `/anime/${slug}`);
  const tag = item.genres?.[0] || item.type || null;

  return (
    <RevealOnView delay={(index % 12) * 35}>
      <Link
        href={href}
        target={isWebtoons ? '_blank' : undefined}
        rel={isWebtoons ? 'noreferrer' : undefined}
        className="group block"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-paper-soft shadow-card">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint font-display">?</div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-paper-card/90 px-2 py-0.5 text-[9px] font-bold uppercase text-ink-soft shadow">
            {isWebtoons ? 'Webtoon' : isSamehadaku ? 'Samehadaku' : isSanka ? 'Anime' : isAnichin ? 'Anichin' : 'Donghua'}
          </span>
          {(item.episode || item.status) && (
            <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {shortLabel(item.episode || item.status)}
            </span>
          )}
        </div>

        <div className="mt-2 px-0.5">
          {tag && <p className="mb-0.5 truncate text-[11px] font-semibold text-accent">{tag}</p>}
          <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{item.title}</p>

          <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-ink-soft">
            {item.type && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5a36"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8Z" fill="#fff" /></svg>
                {item.type}
              </span>
            )}
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
