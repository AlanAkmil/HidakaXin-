'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnimeCard from '../../components/AnimeCard';
import ReadingHistoryRow from '../../components/ReadingHistoryRow';
import { getHistory, clearHistory, getNovelHistory, clearNovelHistory, getKomikHistory, clearKomikHistory, trackMissionProgress } from '../../lib/store';

export default function RiwayatPage() {
  const [items, setItems] = useState(null);
  const [novelItems, setNovelItems] = useState(null);
  const [komikItems, setKomikItems] = useState(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const [history, novel, komik] = await Promise.all([getHistory(), getNovelHistory(), getKomikHistory()]);
      if (!active) return;
      // Webtoons entries now live in komik_history / "Lanjut Baca Komik"
      // instead — filter out any leftover ones from before that change.
      setItems(history.filter((item) => item.source !== 'webtoons'));
      setNovelItems(novel);
      setKomikItems(komik);
    }
    refresh();
    trackMissionProgress('open_riwayat', 1);
    window.addEventListener('hidakaxin:storage', refresh);
    return () => {
      active = false;
      window.removeEventListener('hidakaxin:storage', refresh);
    };
  }, []);

  async function handleClear() {
    await clearHistory();
    setItems([]);
  }

  async function handleClearNovel() {
    await clearNovelHistory();
    setNovelItems([]);
  }

  async function handleClearKomik() {
    await clearKomikHistory();
    setKomikItems([]);
  }

  const isEmpty = items?.length === 0 && novelItems?.length === 0 && komikItems?.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-ink">Riwayat</h1>
        <p className="text-sm text-ink-soft">Tontonan dan bacaan yang baru kamu buka.</p>
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-line bg-paper-card p-8 text-center shadow-card">
          <p className="text-sm text-ink-soft">Belum ada riwayat.</p>
          <Link href="/daftar" className="mt-3 inline-block text-sm font-semibold text-accent">Jelajahi koleksi →</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg font-extrabold text-ink">Anime &amp; Donghua</p>
            <button onClick={handleClear} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
              Hapus semua
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item, i) => (
              <AnimeCard key={item.url + i} item={item} index={i} watchMode />
            ))}
          </div>
        </div>
      )}

      {novelItems && novelItems.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg font-extrabold text-ink">Novel</p>
            <button onClick={handleClearNovel} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
              Hapus semua
            </button>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {novelItems.map((item, i) => (
              <ReadingHistoryRow
                key={item.chapterUrl + i}
                href={item.readHref || `/novel/baca/${item.chapterUrl}`}
                image={item.cover}
                title={item.title}
                subtitle={item.chapterTitle}
                badge="Novel"
              />
            ))}
          </div>
        </div>
      )}

      {komikItems && komikItems.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg font-extrabold text-ink">Komik</p>
            <button onClick={handleClearKomik} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
              Hapus semua
            </button>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {komikItems.map((item, i) => (
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
        </div>
      )}
    </div>
  );
}
