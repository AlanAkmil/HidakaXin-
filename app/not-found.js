import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-6xl font-black text-accent">404</p>
      <p className="mt-3 text-ink-soft">Halaman tidak ditemukan.</p>
      <Link href="/" className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
