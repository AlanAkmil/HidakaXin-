'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import ThemeToggle from '../../components/ThemeToggle';

export default function SetupPage() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
      return () => sub.subscription.unsubscribe();
    } else {
      setSession(null);
    }
  }, []);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
        Profile
      </Link>

      <h1 className="mb-4 font-display text-xl font-extrabold text-ink">Setup</h1>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Akun</p>
      {session === undefined ? null : session ? (
        <div className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-3 shadow-card">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{session.user.email || session.user.phone}</p>
            <p className="text-xs text-ink-faint">Akun tersambung</p>
          </div>
          <button onClick={handleLogout} className="flex-shrink-0 rounded-full border border-line px-4 py-1.5 text-xs font-bold text-ink-soft hover:border-accent hover:text-accent">
            Logout
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-600 px-4 py-3.5 text-sm font-bold text-white shadow-card"
        >
          Login / Daftar Akun
        </Link>
      )}

      <p className="mt-4 text-center text-xs text-ink-faint">
        Favorit &amp; Riwayat masih tersimpan lokal di HP ini.
      </p>

      <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Tampilan</p>
      <ThemeToggle />
    </div>
  );
}
