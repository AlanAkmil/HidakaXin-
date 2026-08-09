import Link from 'next/link';

export default function Pagination({ current = 1, total, basePath, extraQuery = '' }) {
  if (!total || total <= 1) return null;
  const prev = Math.max(1, current - 1);
  const next = Math.min(total, current + 1);

  const pages = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const linkFor = (p) => `${basePath}?page=${p}${extraQuery}`;

  return (
    <div className="mt-8 flex items-center justify-center gap-2 text-sm">
      <Link
        href={linkFor(prev)}
        className={`rounded-full border border-line bg-paper-card px-3 py-1.5 ${current === 1 ? 'pointer-events-none opacity-30' : 'hover:border-accent hover:text-accent'}`}
      >
        ← Prev
      </Link>
      {start > 1 && <span className="px-1 text-ink-faint">…</span>}
      {pages.map((p) => (
        <Link
          key={p}
          href={linkFor(p)}
          className={`rounded-full border px-3 py-1.5 font-semibold ${
            p === current ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-paper-card text-ink-soft hover:border-accent hover:text-accent'
          }`}
        >
          {p}
        </Link>
      ))}
      {end < total && <span className="px-1 text-ink-faint">…</span>}
      <Link
        href={linkFor(next)}
        className={`rounded-full border border-line bg-paper-card px-3 py-1.5 ${current === total ? 'pointer-events-none opacity-30' : 'hover:border-accent hover:text-accent'}`}
      >
        Next →
      </Link>
    </div>
  );
}
