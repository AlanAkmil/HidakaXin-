'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCoins, getOwnedBanners, getSelectedBanner, buyOrSelectBanner, trackMissionProgress } from '../../../lib/store';
import { BANNER_THEMES } from '../../../lib/banners';

export default function BannerShopPage() {
  const [coins, setCoins] = useState(0);
  const [owned, setOwned] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(null);

  async function refresh() {
    const [c, o, s] = await Promise.all([getCoins(), getOwnedBanners(), getSelectedBanner()]);
    setCoins(c);
    setOwned(o);
    setSelected(s);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    trackMissionProgress('banner_shop_visit', 1);
  }, []);

  async function handlePick(id) {
    setBusy(id);
    const res = await buyOrSelectBanner(id);
    setBusy(null);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <Link href="/misi" className="mb-3 inline-block text-sm font-semibold text-accent">← Kembali ke Misi</Link>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">Toko Banner</h1>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper-card px-3 py-1.5">
          <span>⚡</span>
          <span className="text-sm font-bold text-ink">{loaded ? coins : '...'}</span>
        </div>
      </div>
      <p className="mb-5 text-sm text-ink-soft">Banner video buat background Profil & Chat kamu. Beli sekali, pakai kapan aja.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BANNER_THEMES.map((b) => {
          const isOwned = owned.includes(b.id);
          const isSelected = selected === b.id;
          return (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-line bg-paper-card shadow-card">
              <div className="relative aspect-video bg-paper-soft">
                <video src={b.url} muted loop playsInline autoPlay className="h-full w-full object-cover" />
                {isSelected && (
                  <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">Dipakai</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-ink">{b.name}</p>
                <p className="mb-3 text-xs text-ink-faint">{isOwned ? 'Dimiliki' : `⚡ ${b.cost} koin`}</p>
                <button
                  onClick={() => handlePick(b.id)}
                  disabled={busy === b.id || isSelected}
                  className={`w-full rounded-full py-2 text-sm font-bold ${
                    isSelected ? 'bg-paper-soft text-ink-faint' : 'bg-accent text-white'
                  } disabled:opacity-60`}
                >
                  {busy === b.id ? 'Memproses...' : isSelected ? 'Sedang Dipakai' : isOwned ? 'Pakai' : `Beli — ⚡${b.cost}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
