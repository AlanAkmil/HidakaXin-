'use client';

import { useEffect, useState } from 'react';
import { getKomikHistory } from '../lib/store';
import ReadingHistoryRow from './ReadingHistoryRow';
import SectionHeader from './SectionHeader';

export default function ContinueReadingKomik() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await getKomikHistory();
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

  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8">
      <SectionHeader title="Lanjut Baca Komik" href="/riwayat" />
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.slice(0, 10).map((item, i) => (
          <ReadingHistoryRow
            key={item.chapterUrl + i}
            href={item.readHref || `/komik/baca/${item.komikSlug}/${item.chapterSlug}`}
            image={item.cover}
            title={item.title}
            subtitle={item.chapterLabel}
            badge="Komik"
          />
        ))}
      </div>
    </section>
  );
}
