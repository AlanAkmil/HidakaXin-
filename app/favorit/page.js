'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnimeCard from '../../components/AnimeCard';
import { getFavorites } from '../../lib/store';

export default function FavoritPage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await getFavorites();
      if (active) setItems(data);
    }
    load();
    function onStorage() {
      load();
    }
    window.addEventListener('hidakaxin:storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('hidakaxin:storage', onStorage);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Favorit</h1>
      <p className="mb-5 text-sm text-ink-soft">Anime yang kamu simpan.</p>

      {items?.length === 0 && (
        <div className="rounded-xl border border-line bg-paper-card p-8 text-center shadow-card">
          <p className="text-sm text-ink-soft">Belum ada favorit. Ketuk ikon bintang di halaman detail anime.</p>
          <Link href="/daftar" className="mt-3 inline-block text-sm font-semibold text-accent">Jelajahi koleksi →</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, i) => (
            <AnimeCard key={item.url + i} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
