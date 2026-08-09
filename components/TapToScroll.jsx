'use client';

export default function TapToScroll({ children }) {
  function handleTap(e) {
    // Don't hijack taps on real links/buttons inside the reader (e.g. the
    // "Kembali" back button or the "Buka di Webtoons.com" fallback link).
    if (e.target.closest('a, button')) return;
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  }

  return (
    <div onClick={handleTap} className="cursor-pointer">
      {children}
    </div>
  );
}
