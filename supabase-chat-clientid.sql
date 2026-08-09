-- Jalanin ini SEKALI di Supabase SQL Editor (New Query lagi, jangan ditimpa
-- ke query lama). Nambah 1 kolom ke tabel chat_messages yang udah ada,
-- buat nandain pesan itu dari browser/HP mana (biar bisa dibedain
-- kiri/kanan kayak WhatsApp — tanpa perlu login).

alter table chat_messages add column if not exists client_id text;
