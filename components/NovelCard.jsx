import Link from 'next/link';
import RevealOnView from './RevealOnView';

export default function NovelCard({ item, index = 0 }) {
  if (!item) return null;

  return (
    <RevealOnView delay={(index % 12) * 35}>
      <Link href={`/novel/${item.slug}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-paper-soft shadow-card">
          {item.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">📖</div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-paper-card/90 px-2 py-0.5 text-[9px] font-bold uppercase text-ink-soft shadow">
            {item.source === 'meionovel' ? 'Sub Indo' : 'Novel'}
          </span>
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
            {item.chapterCount} Ch
          </span>
        </div>

        <div className="mt-2 px-0.5">
          <p
            className={`mb-0.5 truncate text-[11px] font-semibold ${
              item.status === 'Completed' ? 'text-gold' : 'text-accent'
            }`}
          >
            {item.status}
          </p>
          <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{item.title}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-ink-soft">{item.author}</p>
        </div>
      </Link>
    </RevealOnView>
  );
}
