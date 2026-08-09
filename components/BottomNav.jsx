'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS = {
  home: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  jadwal: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  cari: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  ),
  komik: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5v-13Z" />
      <path strokeLinecap="round" d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    </svg>
  ),
  novel: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5c-1.6-1-3.7-1.5-6-1.5v13c2.3 0 4.4.5 6 1.5m0-13c1.6-1 3.7-1.5 6-1.5v13c-2.3 0-4.4.5-6 1.5m0-13v13" />
    </svg>
  ),
  chat: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  ),
  profile: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff5a36' : '#9a9aa2'} strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
};

const TABS = [
  { href: '/', match: '/', key: 'home', label: 'HOME' },
  { href: '/jadwal', match: '/jadwal', key: 'jadwal', label: 'JADWAL' },
  { href: '/cari', match: '/cari', key: 'cari', label: 'CARI' },
  { href: '/komik', match: '/komik', key: 'komik', label: 'KOMIK' },
  { href: '/novel', match: '/novel', key: 'novel', label: 'NOVEL' },
  { href: '/chat', match: '/chat', key: 'chat', label: 'CHAT' },
  { href: '/profile', match: '/profile', key: 'profile', label: 'PROFILE' }
];

const FULLSCREEN_PREFIXES = ['/komik/baca/', '/komik/wt/', '/novel/baca/'];

export default function BottomNav() {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isFullscreen) return null;

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[94%] max-w-md -translate-x-1/2">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-paper-card px-1 py-2 shadow-nav">
        {TABS.map((tab) => {
          const active = tab.match === '/' ? pathname === '/' : pathname.startsWith(tab.match);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition"
            >
              {ICONS[tab.key](active)}
              <span className={`text-[9px] font-bold tracking-tight ${active ? 'text-accent' : 'text-ink-faint'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
