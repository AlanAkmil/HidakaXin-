'use client';

import { usePathname } from 'next/navigation';

const FULLSCREEN_PREFIXES = ['/komik/baca/', '/komik/wt/', '/novel/baca/'];

export default function MainWrapper({ children }) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  return <main className={`relative z-10 min-h-screen ${isFullscreen ? '' : 'pb-24'}`}>{children}</main>;
}
