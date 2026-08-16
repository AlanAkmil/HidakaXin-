'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SourceMenu from './SourceMenu';
import AnimeSourceMenu from './AnimeSourceMenu';

const FULLSCREEN_PREFIXES = ['/komik/baca/', '/komik/wt/', '/novel/baca/', '/profile', '/chat'];

export default function TopHeader() {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isFullscreen) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
          <span className="text-accent">Hidaka</span>Xin
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/cari"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-card text-ink-soft"
            aria-label="Cari"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
            </svg>
          </Link>
          <SourceMenu />
          <AnimeSourceMenu />
        </div>
      </div>
    </header>
  );
}
