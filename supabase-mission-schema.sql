-- Jalanin SEKALI di Supabase SQL Editor (New Query baru, terpisah dari yang
-- sebelumnya). Ini bikin tabel buat sistem Koin/Misi/Check-in/Banner.

create table if not exists coins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists owned_banners (
  user_id uuid not null references auth.users(id) on delete cascade,
  banner_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, banner_id)
);

create table if not exists checkins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0,
  last_date text
);

create table if not exists mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  date text not null,
  progress integer not null default 0,
  claimed boolean not null default false,
  primary key (user_id, mission_id, date)
);

create table if not exists profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_banner text
);

alter table coins enable row level security;
alter table owned_banners enable row level security;
alter table checkins enable row level security;
alter table mission_progress enable row level security;
alter table profile_settings enable row level security;

create policy "own coins" on coins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own owned_banners" on owned_banners for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own checkins" on checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own mission_progress" on mission_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own profile_settings" on profile_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
