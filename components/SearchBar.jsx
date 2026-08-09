'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar({ defaultValue = '', action = '/cari', placeholder = 'Cari Anime..' }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function handleSubmit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`${action}?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-line bg-paper-card px-4 py-3 shadow-card">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9aa2" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="text"
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </form>
  );
}
