'use client';

import { useEffect } from 'react';
import { getTheme } from '../lib/store';

export default function ThemeSync() {
  useEffect(() => {
    function apply() {
      document.documentElement.classList.toggle('dark', getTheme() === 'dark');
    }
    apply();

    function onChange(e) {
      if (!e.detail || e.detail.key === 'hidakaxin:theme') apply();
    }
    window.addEventListener('hidakaxin:storage', onChange);
    return () => window.removeEventListener('hidakaxin:storage', onChange);
  }, []);

  return null;
}
