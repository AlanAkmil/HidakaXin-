export default function manifest() {
  return {
    name: 'HidakaXin — Nonton Donghua Sub Indo',
    short_name: 'HidakaXin',
    description: 'Portal donghua & cultivation anime — jadwal rilis, koleksi lengkap, streaming kilat.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f6f8',
    theme_color: '#ff5a36',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
