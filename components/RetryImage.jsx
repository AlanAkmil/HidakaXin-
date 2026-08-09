'use client';

import { useState } from 'react';

const MAX_RETRIES = 3;

export default function RetryImage({ src, alt, className, index }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // Cache-bust each retry so the browser doesn't just re-serve a cached failure
  const attemptSrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;

  function handleError() {
    if (attempt < MAX_RETRIES) {
      setTimeout(() => setAttempt((a) => a + 1), 600 * (attempt + 1));
    } else {
      setFailed(true);
    }
  }

  function manualRetry() {
    setFailed(false);
    setAttempt((a) => a + 1);
  }

  if (failed) {
    return (
      <button
        onClick={manualRetry}
        className="flex w-full flex-col items-center justify-center gap-2 border-y border-line bg-paper-soft py-10 text-sm text-ink-soft"
      >
        <span>Halaman {index} gagal dimuat</span>
        <span className="rounded-full border border-line bg-paper-card px-4 py-1.5 text-xs font-semibold text-accent">Coba lagi →</span>
      </button>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={attemptSrc} src={attemptSrc} alt={alt} loading="lazy" className={className} onError={handleError} />
  );
}
