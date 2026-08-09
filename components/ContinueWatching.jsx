'use client';

import { useEffect, useState } from 'react';
import { getHistory } from '../lib/store';
import AnimeRow from './AnimeRow';
import SectionHeader from './SectionHeader';

export default function ContinueWatching() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await getHistory();
      // Webtoons entries now live in komik_history / "Lanjut Baca Komik"
      // instead — filter out any leftover ones from before that change.
      if (active) setItems(data.filter((item) => item.source !== 'webtoons'));
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

  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8">
      <SectionHeader title="Lanjut Nonton" href="/riwayat" />
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.slice(0, 10).map((item, i) => (
          <AnimeRow key={item.url + i} item={item} watchMode />
        ))}
      </div>
    </section>
  );
}
