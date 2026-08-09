'use client';

/**
 * Storage abstraction layer.
 *
 * When the person is logged in (Supabase Auth — Google OAuth via
 * AuthPanel.jsx), favorites and reading/watch history are stored in
 * Supabase tables keyed by user_id, so they sync across every device
 * signed into the same account. When logged out, everything falls back to
 * localStorage exactly like before, so the app still works with zero login.
 *
 * IMPORTANT for callers: every function here returns a Promise now (even
 * the ones that used to be plain sync reads), because a signed-in read has
 * to await a Supabase query. Fire-and-forget calls (pushHistory,
 * pushNovelHistory, pushKomikHistory from a recorder's useEffect) don't
 * need to change at the call site. Anything that reads the return value
 * (getHistory, getFavorites, isFavorite, toggleFavorite, etc.) needs an
 * `await` — see ContinueWatching.jsx / FavoriteButton.jsx for the pattern.
 *
 * Run supabase-schema.sql once in the Supabase SQL editor before this will
 * do anything for logged-in users — it creates the favorites/history/
 * novel_history/komik_history tables with row-level security so each
 * account only ever sees its own rows.
 */

import { supabase } from './supabaseClient';
import { MISSION_POOL } from './missions';
import { BANNER_THEMES } from './banners';

const KEYS = {
  favorites: 'hidakaxin:favorites',
  history: 'hidakaxin:history',
  profile: 'hidakaxin:profile',
  novelHistory: 'hidakaxin:novel:history',
  komikHistory: 'hidakaxin:komik:history',
  theme: 'hidakaxin:theme',
  coins: 'hidakaxin:coins',
  ownedBanners: 'hidakaxin:banners:owned',
  selectedBanner: 'hidakaxin:banners:selected',
  checkin: 'hidakaxin:checkin',
  missionProgress: 'hidakaxin:mission:progress'
};

function read(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notify(key);
  } catch {
    // storage full or unavailable — fail silently, app still usable
  }
}

function notify(key) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('hidakaxin:storage', { detail: { key } }));
  } catch {
    // ignore
  }
}

async function getUserId() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

// ---------- Favorites ----------

export async function getFavorites() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.favorites, []);
  const { data, error } = await supabase
    .from('favorites')
    .select('item')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) return read(KEYS.favorites, []);
  return (data || []).map((row) => row.item);
}

export async function isFavorite(url) {
  const favs = await getFavorites();
  return favs.some((f) => f.url === url);
}

export async function toggleFavorite(item) {
  const uid = await getUserId();
  if (!uid) {
    const current = read(KEYS.favorites, []);
    const exists = current.some((f) => f.url === item.url);
    const next = exists ? current.filter((f) => f.url !== item.url) : [{ ...item, savedAt: Date.now() }, ...current];
    write(KEYS.favorites, next);
    return !exists;
  }

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', uid)
    .eq('url', item.url)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    notify(KEYS.favorites);
    return false;
  }
  await supabase.from('favorites').insert({ user_id: uid, url: item.url, item: { ...item, savedAt: Date.now() } });
  notify(KEYS.favorites);
  return true;
}

// ---------- Watch history (anime/donghua) ----------

export async function getHistory() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.history, []);
  const { data, error } = await supabase
    .from('history')
    .select('item')
    .eq('user_id', uid)
    .order('watched_at', { ascending: false })
    .limit(40);
  if (error) return read(KEYS.history, []);
  return (data || []).map((row) => row.item);
}

export async function pushHistory(item) {
  const uid = await getUserId();
  const enriched = { ...item, watchedAt: Date.now() };
  if (!uid) {
    const current = read(KEYS.history, []).filter((h) => h.url !== item.url);
    const next = [enriched, ...current].slice(0, 40);
    write(KEYS.history, next);
    return;
  }
  await supabase
    .from('history')
    .upsert({ user_id: uid, url: item.url, item: enriched, watched_at: new Date().toISOString() }, { onConflict: 'user_id,url' });
  notify(KEYS.history);
}

export async function clearHistory() {
  const uid = await getUserId();
  if (!uid) {
    write(KEYS.history, []);
    return;
  }
  await supabase.from('history').delete().eq('user_id', uid);
  notify(KEYS.history);
}

// ---------- Novel reading history ----------
// Kept in its own table/key instead of reusing history above, because
// AnimeCard's routing logic (isAnichin/isSanka/else) doesn't know about a
// 'novel' source and would build a broken link for these entries if they
// were mixed into the generic history list.

export async function getNovelHistory() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.novelHistory, []);
  const { data, error } = await supabase
    .from('novel_history')
    .select('item')
    .eq('user_id', uid)
    .order('read_at', { ascending: false })
    .limit(40);
  if (error) return read(KEYS.novelHistory, []);
  return (data || []).map((row) => row.item);
}

export async function pushNovelHistory(item) {
  const uid = await getUserId();
  const enriched = { ...item, readAt: Date.now() };
  if (!uid) {
    const current = read(KEYS.novelHistory, []).filter((h) => h.chapterUrl !== item.chapterUrl);
    const next = [enriched, ...current].slice(0, 40);
    write(KEYS.novelHistory, next);
    return;
  }
  await supabase
    .from('novel_history')
    .upsert(
      { user_id: uid, chapter_url: item.chapterUrl, item: enriched, read_at: new Date().toISOString() },
      { onConflict: 'user_id,chapter_url' }
    );
  notify(KEYS.novelHistory);
}

export async function clearNovelHistory() {
  const uid = await getUserId();
  if (!uid) {
    write(KEYS.novelHistory, []);
    return;
  }
  await supabase.from('novel_history').delete().eq('user_id', uid);
  notify(KEYS.novelHistory);
}

// ---------- Komik reading history (incl. Webtoons) ----------
// Same reasoning as novel history above.

export async function getKomikHistory() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.komikHistory, []);
  const { data, error } = await supabase
    .from('komik_history')
    .select('item')
    .eq('user_id', uid)
    .order('read_at', { ascending: false })
    .limit(40);
  if (error) return read(KEYS.komikHistory, []);
  return (data || []).map((row) => row.item);
}

export async function pushKomikHistory(item) {
  const uid = await getUserId();
  const enriched = { ...item, readAt: Date.now() };
  if (!uid) {
    const current = read(KEYS.komikHistory, []).filter((h) => h.chapterUrl !== item.chapterUrl);
    const next = [enriched, ...current].slice(0, 40);
    write(KEYS.komikHistory, next);
    return;
  }
  await supabase
    .from('komik_history')
    .upsert(
      { user_id: uid, chapter_url: item.chapterUrl, item: enriched, read_at: new Date().toISOString() },
      { onConflict: 'user_id,chapter_url' }
    );
  notify(KEYS.komikHistory);
}

export async function clearKomikHistory() {
  const uid = await getUserId();
  if (!uid) {
    write(KEYS.komikHistory, []);
    return;
  }
  await supabase.from('komik_history').delete().eq('user_id', uid);
  notify(KEYS.komikHistory);
}

// ---------- One-time migration: local device data → Google account ----------
// Called from AuthSync.jsx right after a successful login. Pushes whatever
// was saved locally (favorites + all 3 history types) up to Supabase, then
// clears the local copies. Guarded by a flag so it only runs once per
// browser per account.

export async function migrateLocalDataToAccount() {
  const uid = await getUserId();
  if (!uid || typeof window === 'undefined') return;

  const flagKey = `hidakaxin:migrated:${uid}`;
  if (window.localStorage.getItem(flagKey)) return;

  try {
    const localFavs = read(KEYS.favorites, []);
    for (const item of localFavs) {
      await supabase.from('favorites').upsert({ user_id: uid, url: item.url, item }, { onConflict: 'user_id,url' });
    }

    const localHistory = read(KEYS.history, []);
    for (const item of localHistory) {
      await supabase.from('history').upsert(
        { user_id: uid, url: item.url, item, watched_at: new Date(item.watchedAt || Date.now()).toISOString() },
        { onConflict: 'user_id,url' }
      );
    }

    const localNovel = read(KEYS.novelHistory, []);
    for (const item of localNovel) {
      await supabase.from('novel_history').upsert(
        { user_id: uid, chapter_url: item.chapterUrl, item, read_at: new Date(item.readAt || Date.now()).toISOString() },
        { onConflict: 'user_id,chapter_url' }
      );
    }

    const localKomik = read(KEYS.komikHistory, []);
    for (const item of localKomik) {
      await supabase.from('komik_history').upsert(
        { user_id: uid, chapter_url: item.chapterUrl, item, read_at: new Date(item.readAt || Date.now()).toISOString() },
        { onConflict: 'user_id,chapter_url' }
      );
    }

    write(KEYS.favorites, []);
    write(KEYS.history, []);
    write(KEYS.novelHistory, []);
    write(KEYS.komikHistory, []);
    window.localStorage.setItem(flagKey, '1');
    notify(KEYS.favorites);
  } catch {
    // best-effort — if migration fails, local data just stays local and
    // nothing breaks; the person can keep using the app normally.
  }
}

// ---------- App theme (light / dark) ----------
// Stays device-local on purpose — no reason to sync dark mode across
// devices, and it needs to be readable before Supabase has even responded
// (see the no-flash script in app/layout.js).

export function getTheme() {
  return read(KEYS.theme, 'light');
}

export function setTheme(theme) {
  write(KEYS.theme, theme === 'dark' ? 'dark' : 'light');
}

// ---------- Public chat (Supabase — realtime, shared across everyone) ----------
// Unlike favorites/history above, chat has NO local-storage fallback path:
// it's supposed to be public and shared, so if Supabase is unreachable we
// surface that rather than quietly writing messages only you can see.
//
// Chat works without logging in (people just type a name), so "is this my
// message" can't be determined from an account. Instead each browser gets
// a random client_id saved to localStorage the first time it opens Chat —
// that's what lets the UI put your own messages on the right, WhatsApp
// style, even when you're not signed in.

function getClientId() {
  if (typeof window === 'undefined') return null;
  let id = window.localStorage.getItem('hidakaxin:chat:clientId');
  if (!id) {
    id = `c${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem('hidakaxin:chat:clientId', id);
  }
  return id;
}

function mapChatRow(row) {
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
    clientId: row.client_id || null
  };
}

export async function getChatMessages() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return [];
  return (data || []).map(mapChatRow);
}

export async function sendChatMessage({ author, text }) {
  if (!supabase) return null;
  const uid = await getUserId();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ author: (author || 'Anonim').slice(0, 40), text: text.slice(0, 500), user_id: uid, client_id: getClientId() })
    .select()
    .single();
  if (error) return null;
  return mapChatRow(data);
}

export function isMyChatMessage(message) {
  return !!message.clientId && message.clientId === getClientId();
}

// Subscribes to new chat messages in realtime. Call the returned function
// to unsubscribe (e.g. in a useEffect cleanup).
export function subscribeChatMessages(onInsert) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('public:chat_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      onInsert(mapChatRow(payload.new));
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------- Local profile (display name only, no auth) ----------

export function getProfile() {
  return read(KEYS.profile, { name: 'Penonton', joined: Date.now() });
}

export function setProfileName(name) {
  const current = getProfile();
  const next = { ...current, name };
  write(KEYS.profile, next);
  return next;
}

export const STORAGE_KEYS = KEYS;

// ==================== Koin / Misi / Check-in / Banner ====================
// Same hybrid pattern as favorites/history above: Supabase when logged in
// (syncs across devices), localStorage fallback when logged out (so the
// whole system still works with zero login, just device-scoped instead of
// account-scoped).

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Coins ----------

export async function getCoins() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.coins, 0);
  const { data } = await supabase.from('coins').select('balance').eq('user_id', uid).maybeSingle();
  return data?.balance || 0;
}

export async function addCoins(amount) {
  const uid = await getUserId();
  if (!uid) {
    const next = Math.max(0, read(KEYS.coins, 0) + amount);
    write(KEYS.coins, next);
    return next;
  }
  const { data } = await supabase.from('coins').select('balance').eq('user_id', uid).maybeSingle();
  const next = Math.max(0, (data?.balance || 0) + amount);
  await supabase.from('coins').upsert({ user_id: uid, balance: next, updated_at: new Date().toISOString() });
  notify(KEYS.coins);
  return next;
}

// ---------- Banners ----------

export async function getOwnedBanners() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.ownedBanners, []);
  const { data } = await supabase.from('owned_banners').select('banner_id').eq('user_id', uid);
  return (data || []).map((r) => r.banner_id);
}

export async function getSelectedBanner() {
  const uid = await getUserId();
  if (!uid) return read(KEYS.selectedBanner, null);
  const { data } = await supabase.from('profile_settings').select('selected_banner').eq('user_id', uid).maybeSingle();
  return data?.selected_banner || null;
}

// Buys the banner if not already owned (fails if coins are short), then
// selects it as the active one. Returns { ok, error? }.
export async function buyOrSelectBanner(bannerId) {
  const item = BANNER_THEMES.find((b) => b.id === bannerId);
  if (!item) return { ok: false, error: 'Banner tidak ditemukan' };

  const uid = await getUserId();
  const owned = await getOwnedBanners();

  if (!owned.includes(bannerId)) {
    const balance = await getCoins();
    if (balance < item.cost) return { ok: false, error: 'Koin kamu belum cukup' };
    await addCoins(-item.cost);
    if (!uid) {
      write(KEYS.ownedBanners, [...owned, bannerId]);
    } else {
      await supabase.from('owned_banners').insert({ user_id: uid, banner_id: bannerId });
    }
  }

  if (!uid) {
    write(KEYS.selectedBanner, bannerId);
  } else {
    await supabase.from('profile_settings').upsert({ user_id: uid, selected_banner: bannerId });
  }
  notify(KEYS.selectedBanner);
  return { ok: true };
}

// ---------- Daily check-in (7-day escalating streak) ----------

const CHECKIN_REWARDS = [50, 75, 100, 125, 150, 200, 300];

export async function getCheckinState() {
  const uid = await getUserId();
  if (!uid) {
    const s = read(KEYS.checkin, { streak: 0, lastDate: '' });
    return { streak: s.streak, canClaim: s.lastDate !== todayStr() };
  }
  const { data } = await supabase.from('checkins').select('streak,last_date').eq('user_id', uid).maybeSingle();
  return { streak: data?.streak || 0, canClaim: (data?.last_date || '') !== todayStr() };
}

export async function claimCheckin() {
  const state = await getCheckinState();
  if (!state.canClaim) return { ok: false, error: 'Udah check-in hari ini, balik lagi besok!' };

  const uid = await getUserId();
  const today = todayStr();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  let lastDate = '';
  if (!uid) lastDate = read(KEYS.checkin, { streak: 0, lastDate: '' }).lastDate;
  else {
    const { data } = await supabase.from('checkins').select('last_date').eq('user_id', uid).maybeSingle();
    lastDate = data?.last_date || '';
  }

  let streak = lastDate === yesterday ? state.streak + 1 : 1;
  if (streak > 7) streak = 1;
  const reward = CHECKIN_REWARDS[streak - 1];

  if (!uid) {
    write(KEYS.checkin, { streak, lastDate: today });
  } else {
    await supabase.from('checkins').upsert({ user_id: uid, streak, last_date: today });
  }
  await addCoins(reward);
  notify(KEYS.checkin);
  return { ok: true, streak, reward };
}

// ---------- Daily missions (5 per day, picked from a pool of 100) ----------
// Picked deterministically from date+uid so the same 5 stay put all day
// but change tomorrow — no need to store which ones were picked.

function seedRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h << 5) - h + seedStr.charCodeAt(i);
    h |= 0;
  }
  return function () {
    h = (h * 9301 + 49297) % 233280;
    return Math.abs(h) / 233280;
  };
}

export async function getDailyMissions() {
  const uid = (await getUserId()) || 'guest';
  const rand = seedRandom(`${todayStr()}_${uid}`);
  const pool = MISSION_POOL.slice();
  const picked = [];
  while (picked.length < 5 && pool.length) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export async function getMissionProgress(missionId) {
  const uid = await getUserId();
  const today = todayStr();
  if (!uid) {
    const all = read(KEYS.missionProgress, {});
    return all[`${today}_${missionId}`] || { progress: 0, claimed: false };
  }
  const { data } = await supabase
    .from('mission_progress')
    .select('progress,claimed')
    .eq('user_id', uid)
    .eq('mission_id', missionId)
    .eq('date', today)
    .maybeSingle();
  return { progress: data?.progress || 0, claimed: data?.claimed || false };
}

// Batch version — avoids N separate round trips when rendering the 5
// daily missions at once.
export async function getAllMissionProgress(missionIds) {
  const uid = await getUserId();
  const today = todayStr();
  const map = {};
  missionIds.forEach((id) => {
    map[id] = { progress: 0, claimed: false };
  });
  if (!uid) {
    const all = read(KEYS.missionProgress, {});
    missionIds.forEach((id) => {
      map[id] = all[`${today}_${id}`] || { progress: 0, claimed: false };
    });
    return map;
  }
  const { data } = await supabase
    .from('mission_progress')
    .select('mission_id,progress,claimed')
    .eq('user_id', uid)
    .eq('date', today)
    .in('mission_id', missionIds);
  (data || []).forEach((r) => {
    map[r.mission_id] = { progress: r.progress, claimed: r.claimed };
  });
  return map;
}

// Call this from wherever the underlying action happens (watching an
// episode, sending a chat message, opening a page, etc). It's a no-op for
// any of today's 5 missions that don't match this key, so it's cheap and
// safe to call liberally.
export async function trackMissionProgress(key, amount = 1) {
  const uid = await getUserId();
  const today = todayStr();
  const daily = await getDailyMissions();
  const relevant = daily.filter((m) => m.key === key);
  if (!relevant.length) return;

  for (const m of relevant) {
    const cur = await getMissionProgress(m.id);
    if (cur.claimed || cur.progress >= m.target) continue;
    const next = Math.min(m.target, cur.progress + amount);
    if (!uid) {
      const all = read(KEYS.missionProgress, {});
      all[`${today}_${m.id}`] = { progress: next, claimed: false };
      write(KEYS.missionProgress, all);
    } else {
      await supabase
        .from('mission_progress')
        .upsert({ user_id: uid, mission_id: m.id, date: today, progress: next, claimed: false }, { onConflict: 'user_id,mission_id,date' });
    }
  }
  notify(KEYS.missionProgress);
}

export async function claimMission(missionId) {
  const daily = await getDailyMissions();
  const m = daily.find((x) => x.id === missionId);
  if (!m) return { ok: false, error: 'Misi gak ketemu' };
  const cur = await getMissionProgress(missionId);
  if (cur.claimed) return { ok: false, error: 'Udah diklaim' };
  if (cur.progress < m.target) return { ok: false, error: 'Belum selesai nih, lanjutin dulu ya' };

  const uid = await getUserId();
  const today = todayStr();
  if (!uid) {
    const all = read(KEYS.missionProgress, {});
    all[`${today}_${missionId}`] = { progress: cur.progress, claimed: true };
    write(KEYS.missionProgress, all);
  } else {
    await supabase
      .from('mission_progress')
      .upsert({ user_id: uid, mission_id: missionId, date: today, progress: cur.progress, claimed: true }, { onConflict: 'user_id,mission_id,date' });
  }
  await addCoins(m.reward);
  notify(KEYS.missionProgress);
  return { ok: true, reward: m.reward };
}

// Every distinct watched/read title counts toward the "unique_titles"
// mission, tracked separately from per-action counters above since it
// needs to dedupe by id rather than just counting calls.
export async function trackUniqueTitle(id) {
  if (!id) return;
  const key = `hidakaxin:unique:${todayStr()}`;
  const seen = read(key, []);
  if (seen.includes(id)) return;
  write(key, [...seen, id]);
  await trackMissionProgress('unique_titles', 1);
}
