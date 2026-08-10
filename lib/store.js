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

// Publishes display name + avatar to a small public `profiles` table —
// purely so admin.html can show a human-readable user list. Best-effort,
// never blocks or errors out the caller.
export async function syncProfileToServer(displayName, avatarUrl) {
  const uid = await getUserId();
  if (!uid || !supabase) return;
  try {
    await supabase.from('profiles').upsert({
      user_id: uid,
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString()
    });
  } catch {
    // best-effort, ignore
  }
}

// ==================== Koin / Misi / Check-in / Banner ====================
// Local-first, background-synced — same pattern as Hidaka Music's coin
// system. localStorage is the source of truth for INSTANT reads/writes (no
// awaiting a network round trip, never blocked by a flaky/misconfigured
// Supabase table). Every write also fires a best-effort background sync to
// Supabase (retried a few times, silently gives up — never shows the user
// an error for a background sync issue). On load, pullMissionDataFromServer()
// reconciles local vs server, always keeping whichever is AHEAD so a sync
// hiccup can never make the person's progress go backwards.

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function withRetry(fn, attemptsLeft = 3) {
  const uid = await getUserId();
  if (!uid || !supabase) return;
  try {
    const { error } = await fn(uid);
    if (error) throw error;
  } catch {
    if (attemptsLeft > 1) {
      await new Promise((r) => setTimeout(r, 2000));
      return withRetry(fn, attemptsLeft - 1);
    }
    // give up quietly — local state is already correct either way, and the
    // next pullMissionDataFromServer() call will retry syncing it up.
  }
}

// ---------- Coins ----------

export function getCoins() {
  return read(KEYS.coins, 0);
}

function setCoinsLocal(v) {
  const next = Math.max(0, Math.round(v));
  write(KEYS.coins, next);
  return next;
}

export function addCoins(amount) {
  const next = setCoinsLocal(getCoins() + amount);
  withRetry((uid) => supabase.from('coins').upsert({ user_id: uid, balance: next, updated_at: new Date().toISOString() }));
  return next;
}

// ---------- Banners ----------

export function getOwnedBanners() {
  return read(KEYS.ownedBanners, []);
}

export function getSelectedBanner() {
  return read(KEYS.selectedBanner, null);
}

// Buys the banner if not already owned (fails if coins are short), then
// selects it as the active one. Everything happens locally & instantly;
// returns { ok, error? }.
export function buyOrSelectBanner(bannerId) {
  const item = BANNER_THEMES.find((b) => b.id === bannerId);
  if (!item) return { ok: false, error: 'Banner tidak ditemukan' };

  const owned = getOwnedBanners();
  if (!owned.includes(bannerId)) {
    if (getCoins() < item.cost) return { ok: false, error: 'Koin kamu belum cukup' };
    addCoins(-item.cost);
    const nextOwned = [...owned, bannerId];
    write(KEYS.ownedBanners, nextOwned);
    withRetry((uid) => supabase.from('owned_banners').upsert({ user_id: uid, banner_id: bannerId }));
  }

  write(KEYS.selectedBanner, bannerId);
  withRetry((uid) => supabase.from('profile_settings').upsert({ user_id: uid, selected_banner: bannerId }));
  notify(KEYS.selectedBanner);
  return { ok: true };
}

// ---------- Daily check-in (7-day escalating streak) ----------

const CHECKIN_REWARDS = [50, 75, 100, 125, 150, 200, 300];

export function getCheckinState() {
  const s = read(KEYS.checkin, { streak: 0, lastDate: '' });
  return { streak: s.streak, canClaim: s.lastDate !== todayStr() };
}

export function claimCheckin() {
  const state = getCheckinState();
  if (!state.canClaim) return { ok: false, error: 'Udah check-in hari ini, balik lagi besok!' };

  const s = read(KEYS.checkin, { streak: 0, lastDate: '' });
  const today = todayStr();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  let streak = s.lastDate === yesterday ? state.streak + 1 : 1;
  if (streak > 7) streak = 1;
  const reward = CHECKIN_REWARDS[streak - 1];

  write(KEYS.checkin, { streak, lastDate: today });
  addCoins(reward);
  withRetry((uid) => supabase.from('checkins').upsert({ user_id: uid, streak, last_date: today }));
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

let _dailyMissionsCache = null;
export async function getDailyMissions() {
  if (_dailyMissionsCache && _dailyMissionsCache.date === todayStr()) return _dailyMissionsCache.list;
  const uid = (await getUserId()) || 'guest';
  const rand = seedRandom(`${todayStr()}_${uid}`);
  const pool = MISSION_POOL.slice();
  const picked = [];
  while (picked.length < 5 && pool.length) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  _dailyMissionsCache = { date: todayStr(), list: picked };
  return picked;
}

function readMissionMap() {
  return read(KEYS.missionProgress, {});
}

export function getMissionProgress(missionId) {
  const all = readMissionMap();
  return all[`${todayStr()}_${missionId}`] || { progress: 0, claimed: false };
}

export async function getAllMissionProgress(missionIds) {
  const all = readMissionMap();
  const today = todayStr();
  const map = {};
  missionIds.forEach((id) => {
    map[id] = all[`${today}_${id}`] || { progress: 0, claimed: false };
  });
  return map;
}

// Call this from wherever the underlying action happens (watching an
// episode, sending a chat message, opening a page, etc). It's a no-op for
// any of today's 5 missions that don't match this key, so it's cheap and
// safe to call liberally. Everything is written locally & instantly.
export async function trackMissionProgress(key, amount = 1) {
  const today = todayStr();
  const daily = await getDailyMissions();
  const relevant = daily.filter((m) => m.key === key);
  if (!relevant.length) return;

  const all = readMissionMap();
  for (const m of relevant) {
    const cur = all[`${today}_${m.id}`] || { progress: 0, claimed: false };
    if (cur.claimed || cur.progress >= m.target) continue;
    all[`${today}_${m.id}`] = { progress: Math.min(m.target, cur.progress + amount), claimed: false };
  }
  write(KEYS.missionProgress, all);
}

export async function claimMission(missionId) {
  const daily = await getDailyMissions();
  const m = daily.find((x) => x.id === missionId);
  if (!m) return { ok: false, error: 'Misi gak ketemu' };
  const cur = getMissionProgress(missionId);
  if (cur.claimed) return { ok: false, error: 'Udah diklaim' };
  if (cur.progress < m.target) return { ok: false, error: 'Belum selesai nih, lanjutin dulu ya' };

  const today = todayStr();
  const all = readMissionMap();
  all[`${today}_${missionId}`] = { progress: cur.progress, claimed: true };
  write(KEYS.missionProgress, all);
  withRetry((uid) =>
    supabase
      .from('mission_progress')
      .upsert({ user_id: uid, mission_id: missionId, date: today, progress: cur.progress, claimed: true }, { onConflict: 'user_id,mission_id,date' })
  );
  addCoins(m.reward);
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

// ---------- Pull-and-reconcile from server ----------
// Call once after login (or on relevant page mount) to bring in progress
// made on OTHER devices. Always keeps whichever side (local vs server) is
// further ahead — never overwrites local with a smaller server value, and
// pushes local up to the server if local is ahead instead.

export async function pullMissionDataFromServer() {
  const uid = await getUserId();
  if (!uid || !supabase) return;

  try {
    const { data: coinRow } = await supabase.from('coins').select('balance').eq('user_id', uid).maybeSingle();
    const serverCoins = coinRow?.balance || 0;
    const localCoins = getCoins();
    if (serverCoins > localCoins) setCoinsLocal(serverCoins);
    else if (localCoins > serverCoins) withRetry((u) => supabase.from('coins').upsert({ user_id: u, balance: localCoins, updated_at: new Date().toISOString() }));
  } catch {}

  try {
    const { data: checkinRow } = await supabase.from('checkins').select('streak,last_date').eq('user_id', uid).maybeSingle();
    if (checkinRow) {
      const local = read(KEYS.checkin, { streak: 0, lastDate: '' });
      const serverDate = checkinRow.last_date || '';
      if (serverDate > local.lastDate || (serverDate === local.lastDate && checkinRow.streak > local.streak)) {
        write(KEYS.checkin, { streak: checkinRow.streak, lastDate: serverDate });
      } else if (local.lastDate > serverDate) {
        withRetry((u) => supabase.from('checkins').upsert({ user_id: u, streak: local.streak, last_date: local.lastDate }));
      }
    }
  } catch {}

  try {
    const { data: bannerRows } = await supabase.from('owned_banners').select('banner_id').eq('user_id', uid);
    const serverOwned = (bannerRows || []).map((r) => r.banner_id);
    const localOwned = getOwnedBanners();
    const merged = [...new Set([...localOwned, ...serverOwned])];
    if (merged.length !== localOwned.length) write(KEYS.ownedBanners, merged);
    const missingOnServer = merged.filter((id) => !serverOwned.includes(id));
    missingOnServer.forEach((id) => withRetry((u) => supabase.from('owned_banners').upsert({ user_id: u, banner_id: id })));

    const { data: settingsRow } = await supabase.from('profile_settings').select('selected_banner').eq('user_id', uid).maybeSingle();
    if (settingsRow?.selected_banner && !getSelectedBanner()) write(KEYS.selectedBanner, settingsRow.selected_banner);
  } catch {}

  try {
    const today = todayStr();
    const daily = await getDailyMissions();
    const ids = daily.map((m) => m.id);
    const { data: progressRows } = await supabase
      .from('mission_progress')
      .select('mission_id,progress,claimed')
      .eq('user_id', uid)
      .eq('date', today)
      .in('mission_id', ids);
    if (progressRows?.length) {
      const all = readMissionMap();
      progressRows.forEach((r) => {
        const key = `${today}_${r.mission_id}`;
        const cur = all[key] || { progress: 0, claimed: false };
        if (r.claimed || r.progress > cur.progress) {
          all[key] = { progress: Math.max(r.progress, cur.progress), claimed: cur.claimed || r.claimed };
        }
      });
      write(KEYS.missionProgress, all);
    }
  } catch {}

  notify(KEYS.coins);
}
