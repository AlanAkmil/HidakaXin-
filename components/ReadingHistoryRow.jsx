import Link from 'next/link';

/**
 * Horizontal history card for content that isn't anime/donghua (novel,
 * komik) — same visual shape as AnimeRow but without its
 * anime/donghua/anichin/sanka routing logic, since the href is just
 * passed in directly by the caller.
 */
export default function ReadingHistoryRow({ href, image, title, subtitle, badge }) {
  return (
    <Link href={href} className="flex w-64 flex-shrink-0 gap-3 rounded-xl border border-line bg-paper-card p-2 shadow-card sm:w-72">
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-paper-soft">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint font-display text-xs">?</div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{title}</p>
        {subtitle && <p className="mt-1 truncate text-[11px] font-medium text-ink-soft">{subtitle}</p>}
        {badge && (
          <span className="mt-1.5 inline-block rounded-full bg-paper-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-faint">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
