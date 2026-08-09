// Pool misi HidakaXin — generate otomatis dari kategori x target (sama
// pola kayak MISSION_POOL di Hidaka Music), biar gampang nambah/ubah
// kategori tanpa nulis ratusan baris manual. Total di bawah ini pas 100.
//
// Tiap hari cuma 5 misi acak yang dipilih dari pool ini (lihat
// getDailyMissions di lib/store.js), seed dari tanggal + user id biar
// konsisten sepanjang hari itu tapi ganti besok.

const MISSION_CATEGORIES = [
  { key: 'watch', icon: '📺', label: 'Nonton Episode', unit: 'episode', mult: 8, targets: [1, 2, 3, 4, 5, 7, 10, 13, 16, 20, 25, 30, 40, 50] },
  { key: 'komik', icon: '📖', label: 'Baca Chapter Komik', unit: 'chapter', mult: 7, targets: [1, 2, 3, 4, 5, 7, 10, 13, 16, 20, 25, 30] },
  { key: 'novel', icon: '📕', label: 'Baca Chapter Novel', unit: 'chapter', mult: 7, targets: [1, 2, 3, 4, 5, 7, 10, 13, 16, 20, 25, 30] },
  { key: 'favorite', icon: '⭐', label: 'Tambah ke Favorit', unit: 'judul', mult: 6, targets: [1, 2, 3, 4, 5, 7, 10, 13, 16, 20] },
  { key: 'search', icon: '🔍', label: 'Cari Judul', unit: 'kali', mult: 8, targets: [1, 2, 3, 4, 5, 7, 10, 13] },
  { key: 'chat', icon: '💬', label: 'Kirim Pesan di Chat', unit: 'pesan', mult: 5, targets: [1, 2, 3, 5, 7, 10, 15, 20] },
  { key: 'unique_titles', icon: '🎬', label: 'Tonton/Baca Judul Berbeda-beda', unit: 'judul', mult: 9, targets: [2, 3, 5, 7, 10, 15, 20, 25] },
  { key: 'open_jadwal', icon: '📅', label: 'Buka Halaman Jadwal', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'open_komik_page', icon: '📚', label: 'Buka Halaman Komik', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'open_novel_page', icon: '📗', label: 'Buka Halaman Novel', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'open_profile', icon: '👤', label: 'Buka Profil', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'open_riwayat', icon: '🕒', label: 'Buka Riwayat', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'open_chat', icon: '🗨️', label: 'Buka Halaman Chat', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'theme_switch', icon: '🌗', label: 'Ganti Tema Terang/Gelap', unit: 'kali', mult: 15, targets: [1, 3] },
  { key: 'open_beranda', icon: '🏠', label: 'Buka Beranda', unit: 'kali', mult: 10, targets: [1, 3, 5] },
  { key: 'genre_browse', icon: '🏷️', label: 'Jelajahi Halaman Genre', unit: 'kali', mult: 15, targets: [1, 2, 3] },
  { key: 'banner_shop_visit', icon: '🎨', label: 'Buka Toko Banner', unit: 'kali', mult: 15, targets: [1, 3] }
];

export const MISSION_POOL = [];
MISSION_CATEGORIES.forEach((cat) => {
  cat.targets.forEach((target) => {
    const reward = Math.max(10, Math.round(target * cat.mult));
    MISSION_POOL.push({
      id: `${cat.key}_${target}`,
      key: cat.key,
      icon: cat.icon,
      title: `${cat.label} ${target} ${cat.unit}`,
      target,
      reward
    });
  });
});
