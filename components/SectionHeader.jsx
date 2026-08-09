import Link from 'next/link';

export default function SectionHeader({ title, href }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      {href && (
        <Link href={href} className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper-card text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}
