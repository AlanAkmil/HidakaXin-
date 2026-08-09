'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFavorites, getHistory, getProfile, setProfileName, migrateLocalDataToAccount, trackMissionProgress } from '../../lib/store';
import { supabase } from '../../lib/supabaseClient';
import BannerBackground from '../../components/BannerBackground';

const SECTIONS = [
  {
    title: 'Menu',
    items: [
      { href: '/favorit', label: 'Favorit', icon: 'star' },
      { href: '/riwayat', label: 'Riwayat', icon: 'clock' },
      { href: '/chat', label: 'Chat', icon: 'chat' },
      { href: '/jadwal', label: 'Jadwal', icon: 'calendar' },
      { href: '/misi', label: 'Misi', icon: 'coin' }
    ]
  },
  {
    title: 'Akun',
    items: [
      { href: '/setup', label: 'Setup', icon: 'gear' }
    ]
  }
];

const ICONS = {
  star: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  chat: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.08 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9.08a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.5 1.2-2.2 2.5-2.2s2.5.7 2.5 2c0 2-5 1.5-5 3.7 0 1.3 1.2 2 2.5 2s2.5-.7 2.5-2.2" /></>
};

export default function ProfilePage() {
  const [name, setName] = useState('Penonton');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [histCount, setHistCount] = useState(0);
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const p = getProfile();
    setName(p.name);
    setDraft(p.name);

    async function refreshCounts() {
      const [favs, hist] = await Promise.all([getFavorites(), getHistory()]);
      setFavCount(favs.length);
      setHistCount(hist.length);
    }
    refreshCounts();
    window.addEventListener('hidakaxin:storage', refreshCounts);
    trackMissionProgress('open_profile', 1);

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) migrateLocalDataToAccount().then(refreshCounts);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        setSession(s);
        if (event === 'SIGNED_IN') migrateLocalDataToAccount().then(refreshCounts);
      });
      return () => {
        sub.subscription.unsubscribe();
        window.removeEventListener('hidakaxin:storage', refreshCounts);
      };
    } else {
      setSession(null);
    }
    return () => window.removeEventListener('hidakaxin:storage', refreshCounts);
  }, []);

  function saveName() {
    const trimmed = draft.trim() || 'Penonton';
    setProfileName(trimmed);
    setName(trimmed);
    setEditing(false);
  }

  const joinDate = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <BannerBackground />
      <div className="relative overflow-hidden bg-gradient-to-br from-accent to-accent-600 px-5 pb-6 pt-8 text-white">
        <svg className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2 2 22h20L12 2Z" />
        </svg>

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full max-w-[180px] rounded-full border border-white/40 bg-paper-card/10 px-3 py-1.5 text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                  placeholder="Nama kamu"
                  autoFocus
                />
                <button onClick={saveName} className="flex-shrink-0 rounded-full bg-paper-card px-3 py-1.5 text-xs font-bold text-accent">
                  Simpan
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-left">
                <p className="truncate font-display text-2xl font-extrabold">{name}</p>
                <p className="text-xs text-white/80">Ketuk untuk ganti nama</p>
              </button>
            )}
          </div>

          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-paper-card/15 text-xl font-black">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div className="relative mt-6 flex items-center gap-6">
          <Stat icon="star" value={favCount} label="Favorit" />
          <Stat icon="clock" value={histCount} label="Riwayat" />
          {joinDate && <Stat icon="calendar" value={joinDate} label="Bergabung" small />}
        </div>
      </div>

      <div className="px-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{section.title}</p>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {section.items.map((m) => (
                <Link key={m.href} href={m.href} className="flex flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper-card shadow-card">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff5a36" strokeWidth="2">
                      {ICONS[m.icon]}
                    </svg>
                  </div>
                  <span className="text-center text-[11px] font-bold text-ink-soft">{m.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, value, label, small }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-80">
        {ICONS[icon]}
      </svg>
      <div className="leading-tight">
        <p className={small ? 'text-xs font-bold' : 'font-display text-sm font-extrabold'}>{value}</p>
        <p className="text-[10px] text-white/75">{label}</p>
      </div>
    </div>
  );
}
