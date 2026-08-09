'use client';

import { useEffect, useState } from 'react';
import { getSelectedBanner } from '../lib/store';
import { BANNER_THEMES } from '../lib/banners';

// Renders the person's chosen banner video full-bleed behind whatever page
// mounts this (Profile, Chat) — with a dark gradient overlay so text on top
// stays readable. Renders nothing if they haven't bought/picked a banner.
export default function BannerBackground() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const id = await getSelectedBanner();
      const item = BANNER_THEMES.find((b) => b.id === id);
      if (active) setUrl(item?.url || null);
    }
    load();
    window.addEventListener('hidakaxin:storage', load);
    return () => {
      active = false;
      window.removeEventListener('hidakaxin:storage', load);
    };
  }, []);

  if (!url) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <video src={url} muted loop playsInline autoPlay className="h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/70 via-paper/85 to-paper" />
    </div>
  );
}
