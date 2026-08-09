-- Jalanin ini SEKALI di Supabase Dashboard → SQL Editor → New Query → Run.
-- Ini TAMBAHAN buat chat publik realtime — beda dari supabase-schema.sql
-- yang udah lu jalanin sebelumnya (yang itu buat favorites/history). Aman
-- dijalanin kapan aja, gak nimpa/ganggu tabel yang udah ada.

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author text not null check (char_length(author) <= 40),
  text text not null check (char_length(text) <= 500),
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;

-- Chat publik: siapa aja (login atau nggak) boleh baca semua pesan dan
-- kirim pesan baru. Gak ada policy update/delete, jadi pesan yang udah
-- terkirim gak bisa diubah/dihapus orang lain (termasuk pengirimnya
-- sendiri lewat app ini — kalau nanti mau nambah fitur hapus pesan
-- sendiri, tinggal tambah policy delete pakai `auth.uid() = user_id`).
create policy "anyone can read chat" on chat_messages for select
  using (true);

create policy "anyone can send chat" on chat_messages for insert
  with check (true);

-- Wajib biar Supabase Realtime nyiarin INSERT baru ke semua yang lagi
-- nyambung ke halaman Chat (biar update tanpa refresh).
alter publication supabase_realtime add table chat_messages;
