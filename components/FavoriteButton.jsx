'use client';

import { useEffect, useState } from 'react';
import { isFavorite, toggleFavorite, trackMissionProgress } from '../lib/store';

export default function FavoriteButton({ item }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let active = true;
    isFavorite(item.url).then((v) => {
      if (active) setFav(v);
    });
    return () => {
      active = false;
    };
  }, [item.url]);

  async function handleClick() {
    const nowFav = await toggleFavorite(item);
    setFav(nowFav);
    if (nowFav) trackMissionProgress('favorite', 1);
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        fav ? 'border-gold bg-gold-soft text-gold' : 'border-line bg-paper-card text-ink-soft hover:border-gold hover:text-gold'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? '#f2a900' : 'none'} stroke="#f2a900" strokeWidth="2">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2Z" />
      </svg>
      {fav ? 'Tersimpan' : 'Favoritkan'}
    </button>
  );
}
