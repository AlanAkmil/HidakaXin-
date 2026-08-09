'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const OPTIONS = [
  { value: 'animexin', label: 'AnimeXin' },
  { value: 'anichin', label: 'Anichin' }
];

function readCookie() {
  if (typeof document === 'undefined') return 'animexin';
  const match = document.cookie.match(/hidakaxin_donghua_source=([^;]+)/);
  return match ? match[1] : 'animexin';
}

export default function SourceMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('animexin');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setCurrent(readCookie());
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function selectSource(value) {
    if (value === current || loading) return;
    setLoading(true);
    try {
      await fetch('/api/settings/donghua-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: value })
      });
      setCurrent(value);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-card text-ink-soft"
        aria-label="Pilih server donghua"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border border-line bg-paper-card shadow-nav">
          <p className="border-b border-line px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Server Donghua
          </p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectSource(opt.value)}
              disabled={loading}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition ${
                opt.value === current ? 'text-accent' : 'text-ink-soft hover:bg-paper-soft'
              }`}
            >
              {opt.label}
              {opt.value === current && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          <p className="border-t border-line px-4 py-2 text-[10px] text-ink-faint">
            Ganti ini bakal refresh Home, Jadwal, & Cari ke sumber donghua yang dipilih.
          </p>
        </div>
      )}
    </div>
  );
}
