-- Tambahan kecil buat chat_messages yang udah dibikin sebelumnya — jalanin
-- SEKALI lagi di SQL Editor (New Query baru). Ini nambah kolom buat nandain
-- pesan siapa yang ngirim (device masing-masing), biar bubble chat bisa
-- dibedain kiri/kanan kayak WhatsApp.

alter table chat_messages add column if not exists client_id text;
