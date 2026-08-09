'use client';

import { useEffect, useState } from 'react';
import { getTheme, setTheme, trackMissionProgress } from '../lib/store';

export default function ThemeToggle() {
  const [theme, setLocalTheme] = useState('light');

  useEffect(() => {
    setLocalTheme(getTheme());
  }, []);

  function choose(next) {
    setTheme(next);
    setLocalTheme(next);
    trackMissionProgress('theme_switch', 1);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-paper-card px-4 py-3 shadow-card">
      <div>
        <p className="text-sm font-bold text-ink">Tema Aplikasi</p>
        <p className="text-xs text-ink-faint">Berlaku ke seluruh halaman</p>
      </div>
      <div className="flex overflow-hidden rounded-full border border-line">
        <button
          onClick={() => choose('light')}
          className={`px-3 py-1.5 text-xs font-bold transition ${
            theme === 'light' ? 'bg-accent text-white' : 'bg-paper-card text-ink-soft'
          }`}
        >
          Terang
        </button>
        <button
          onClick={() => choose('dark')}
          className={`px-3 py-1.5 text-xs font-bold transition ${
            theme === 'dark' ? 'bg-accent text-white' : 'bg-paper-card text-ink-soft'
          }`}
        >
          Gelap
        </button>
      </div>
    </div>
  );
}
