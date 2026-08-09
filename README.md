# HidakaXin

Portal donghua sub Indo — Next.js 14 (App Router), scraping AnimeXin. Tema terang (putih), dengan bottom nav bergaya app native: Home, Jadwal, Cari, Chat, Profile.

## Fitur

- **Beranda** — Lanjut Nonton (riwayat lokal), Sedang Hangat, Judul Baru, Jadwal Hari Ini, Paling Populer
- **Koleksi** (`/daftar`) — filter urutan + pagination
- **Detail anime** (`/anime/[slug]`) — info lengkap, tombol Favorit, daftar episode, rekomendasi
- **Watch** (`/watch/[slug]`) — player dengan switch server (fix Error 153 YouTube via konversi ke embed URL), link download, riwayat tercatat otomatis
- **Genre** (`/genres`, `/genre/[slug]`)
- **Jadwal** (`/jadwal`) — tab hari (Sen–Sab), card kecil per anime
- **Cari** (`/cari`) — kategori Genre (card besar), Studio (grid, best-effort search karena sumber tidak punya endpoint studio), Tahun, hasil pencarian
- **Chat publik** (`/chat`) — placeholder pakai `localStorage`, struktur kode sudah dipisah di `lib/store.js` biar gampang diganti ke Supabase/Firebase (realtime antar-user) nanti
- **Profile** (`/profile`) — nama lokal, statistik Favorit/Riwayat, menu ke Favorit/Riwayat/Chat/Jadwal
- **Favorit** (`/favorit`) & **Riwayat** (`/riwayat`) — tersimpan di `localStorage` (belum ada akun/login)

Catatan jujur: sumber yang di-scrape (AnimeXin) tidak punya data "views"/"favorites" seperti di beberapa app referensi — jadi card di sini menampilkan data asli yang tersedia (rating, episode, status, sub) dengan gaya visual yang sama.

## Struktur Data

Semua data diambil langsung dari `lib/scraper.js` di server component (tanpa perlu fetch ke API sendiri). Endpoint JSON mentah tetap ada di `/api/*` kalau suatu saat mau dipakai app lain (misal APK native).

## Migrasi Chat ke Supabase/Firebase (langkah selanjutnya)

Semua pemanggilan storage ada di satu file: `lib/store.js`. Untuk bikin chat beneran publik/realtime:

- **Supabase**: bikin tabel `messages`, ganti isi `getChatMessages`/`sendChatMessage` pakai `supabase.from('messages')` + `supabase.channel()` buat realtime.
- **Firebase**: bikin koleksi Firestore `messages`, ganti isi fungsi yang sama pakai `onSnapshot()`.

Halaman `/chat` tidak perlu diubah — dia cuma manggil fungsi dari `lib/store.js`.

## Jadi Aplikasi Android (APK) yang bisa di-download

Project ini sudah disiapkan sebagai PWA (manifest + icon + service worker di `app/manifest.js`, `public/icons/`, `public/sw.js`). Buat generate file `.apk` tanpa perlu PC/Android Studio:

1. Deploy dulu ke Vercel/Netlify sampai online (misal `https://hidakaxin.vercel.app`).
2. Buka **[pwabuilder.com](https://www.pwabuilder.com)** dari browser HP.
3. Masukkan URL situs kamu → dia bakal audit manifest/service worker/icon (harusnya semua ✅ karena udah disiapkan).
4. Klik **Package for stores** → pilih **Android** → isi opsi (nama paket, dll, boleh default) → **Generate**.
5. Download file `.apk`-nya, install langsung di HP (aktifkan dulu "Install dari sumber tidak dikenal" di Settings kalau diminta).

Catatan: karena APK ini pada dasarnya WebView yang nunjuk ke situs live, situsnya harus tetap online (di Vercel/Netlify) biar APK-nya jalan — bukan aplikasi offline penuh.

## Jadi Aplikasi Android Native (Capacitor + GitHub Actions) — Jalur B

Selain PWA/PWABuilder di atas, project ini juga udah disiapkan sebagai **project Capacitor asli** (folder `android/`) plus workflow **GitHub Actions** yang otomatis compile jadi `.apk` di cloud — jadi nggak perlu Android Studio/PC sama sekali.

Cara pakainya (di HP):

1. Upload semua isi project ini (termasuk folder `android/` dan `.github/`) ke GitHub, seperti biasa.
2. Buka repo GitHub-nya → tab **Actions**. Workflow "Build Android APK" bakal otomatis jalan tiap kali ada push ke branch `main` (butuh ±5-8 menit, karena download Android SDK dari nol tiap run).
3. Kalau progress-nya udah selesai (centang hijau ✅) → buka run itu → scroll ke bagian **Artifacts** → download **HidakaXin-debug-apk** (bentuknya .zip, di dalamnya ada `app-debug.apk`).
4. Extract, install `app-debug.apk` di HP (izinin "install dari sumber tidak dikenal" kalau diminta).

Catatan penting:
- App ini kebentuk sebagai **WebView shell** yang nunjuk ke `capacitor.config.json` → `server.url` (defaultnya `https://hidakaxin.vercel.app`). **Ganti URL itu ke domain live kamu yang sebenarnya** kalau beda, baru push ulang.
- Karena Next.js di project ini pakai server component + API routes (scraping live), app-nya nggak bisa di-bundle offline penuh — sama kayak jalur PWA, situsnya harus tetap online.
- APK yang dihasilkan itu **debug build** (belum ditandatangani buat rilis ke Play Store) — cukup buat dipakai/di-install sendiri. Kalau nanti mau publish ke Play Store, perlu setup signing key terpisah (bisa dibantu belakangan kalau udah butuh).
- Ganti ikon/nama app: edit `android/app/src/main/res/mipmap-*/ic_launcher*.png` dan `android/app/src/main/res/values/strings.xml`.

## Deploy dari HP (tanpa PC)

1. **Push ke GitHub**
   - Buka repo baru di GitHub (web/app), lalu upload semua file di folder ini. Kalau pakai GitHub app/web mobile, gunakan fitur "Upload files" atau "Add file → Upload files", drag semua isi folder `hidakaxin/` (bukan foldernya, tapi isinya).
   - Alternatif: pakai Working Copy / termux kalau ada, `git init && git add . && git commit -m "init" && git remote add origin <repo-url> && git push -u origin main`.

2. **Import ke Vercel**
   - Buka [vercel.com](https://vercel.com) dari browser HP → New Project → Import repo GitHub tadi.
   - Framework preset otomatis kedeteksi "Next.js" — biarin default (build command `next build`, output otomatis).
   - Klik Deploy, tunggu ± 1-2 menit.

3. Selesai — domain `*.vercel.app` langsung jalan.

## Catatan Penting

- Scraper ini bergantung ke struktur HTML `animexin.dev`. Kalau sewaktu-waktu situs sumber ganti markup, selector CSS di `lib/scraper.js` perlu disesuaikan lagi.
- `revalidate` di tiap halaman dipasang biar Vercel nge-cache hasil scrape beberapa menit, bisa diubah sesuai kebutuhan.
- Ganti `metadataBase` di `app/layout.js` kalau domain Vercel-nya beda dari `hidakaxin.vercel.app`.
- Studio list di `lib/studios.js` itu daftar statis (curated) karena sumber tidak punya index studio — gampang diedit/ditambah.

## Development lokal (opsional, kalau ada akses PC/termux)

```bash
npm install
npm run dev
```
