// Donghua source, now backed by Sanka Vollerei's own Donghua API
// (sankavollerei.web.id/anime/donghua/*) instead of the old
// vps-donghuawatch.vercel.app "iFilm" wrapper. Same host/product family as
// sankaScraper.js, but the donghua endpoints' exact JSON field names aren't
// documented anywhere either (docs only show paths + prose descriptions,
// no sample response bodies) — so this keeps the same defensive "try
// several likely field names" approach the old file used, rather than
// assuming one fixed shape.
const axios = require('axios');

const API_BASE = 'https://www.sankavollerei.web.id';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  }
});

// Simple in-memory cache + sliding-window rate limiter, same pattern as
// sankaScraper.js. NOTE: this is a *separate* counter from sankaScraper.js's
// own limiter even though both hit sankavollerei.web.id — each module only
// throttles its own traffic, so total combined requests to the host aren't
// jointly capped. Fine for now since donghua traffic is much lower volume
// than the main anime scraper, but worth merging into a shared limiter if
// Sanka starts rate-limiting us in practice.
const cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;
const REQUEST_LIMIT = 35;
const WINDOW_MS = 60 * 1000;
const requestTimestamps = [];

async function waitForSlot() {
  while (true) {
    const now = Date.now();
    while (requestTimestamps.length && now - requestTimestamps[0] > WINDOW_MS) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < REQUEST_LIMIT) {
      requestTimestamps.push(now);
      return;
    }
    const waitMs = WINDOW_MS - (now - requestTimestamps[0]) + 50;
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

async function apiGet(path, retries = 3) {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  await waitForSlot();

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await client.get(path);
      if (res.data?.ok === false || res.data?.success === false) {
        throw new Error(res.data?.message || res.data?.error || `Gagal fetch ${path}`);
      }
      cache.set(path, { data: res.data, time: Date.now() });
      return res.data;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

// ---------- defensive field helpers (ported from the old iFilm-based file) ----------

function pick(obj, keys, fallback = null) {
  if (!obj) return fallback;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

function unwrapData(json) {
  let d = json.data !== undefined ? json.data : json;
  if (d && d.data !== undefined && typeof d.data === 'object' && !Array.isArray(d.data)) d = d.data;
  return d;
}

function extractList(json) {
  if (!json) return [];
  let d = json.data !== undefined ? json.data : json;
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') {
      const candidates = ['data', 'results', 'list', 'items', 'animeList', 'donghuaList', 'anime', 'donghua', 'ongoing', 'ongoingDonghua'];
      let found = false;
      for (const key of candidates) {
        if (Array.isArray(d[key])) { d = d[key]; found = true; break; }
      }
      if (found) continue;
      const arrProp = Object.values(d).find((v) => Array.isArray(v));
      if (arrProp) { d = arrProp; continue; }
    }
    break;
  }
  return Array.isArray(d) ? d : [];
}

function rawSlugFrom(item) {
  const raw = pick(item, ['slug', 'href', 'link', 'url', 'id']);
  if (!raw) return null;
  const parts = String(raw).split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// Anichin-style listings link to the latest EPISODE, not the series itself
// (e.g. "little-fairy-yao-episode-03-subtitle-indonesia" — same convention
// confirmed by Sanka's own docs example URL). Strip that suffix to get the
// series slug for the detail route.
function getSeriesSlugFrom(item) {
  const last = rawSlugFrom(item);
  if (!last) return null;
  // Confirmed from real API responses: normal episodes end in
  // "-episode-03-subtitle-indonesia", but the FINALE episode ends in
  // "-episode-40-tamat-subtitle-indonesia" (extra "-tamat-" wedged in).
  // Handle both, plus bare "-episode-N" with no suffix at all.
  return last.replace(/-episode-\d+(-tamat)?(-subtitle-indonesia)?\/?$/i, '');
}

// Episode entries inside a series' episode list must KEEP their full slug.
function getEpisodeSlugFrom(item) {
  return rawSlugFrom(item);
}

// Normalizes a raw list item into the shape normalizeAnichin()/AnimeCard expect.
function mapListItem(item) {
  const slug = getSeriesSlugFrom(item);
  if (!slug) return null;
  return {
    title: pick(item, ['title', 'judul', 'name'], 'Tanpa Judul'),
    url: `https://placeholder.invalid/${slug}`, // slug is what matters for routing
    slug,
    image: pick(item, ['poster', 'thumbnail', 'thumb', 'image', 'img', 'cover', 'gambar']),
    episode: pick(item, ['episode', 'ep', 'current_episode', 'latestEpisode', 'episode_number']),
    status: pick(item, ['status', 'type_status'], 'Ongoing'),
    genres: (() => {
      const g = pick(item, ['category', 'type', 'genre', 'genres'], []);
      if (Array.isArray(g)) return g.map((x) => (typeof x === 'object' ? pick(x, ['name'], '') : x)).filter(Boolean);
      return g ? [g] : [];
    })(),
    rating: pick(item, ['rating', 'score'])
  };
}

class AnichinScraper {
  constructor() {
    this.base = API_BASE;
  }

  // Home listing — used for the homepage's "anichin" section when that
  // source is active. /home's exact shape is unconfirmed (could be a flat
  // list or a {ongoing:{...}, completed:{...}} combo like the main anime
  // API's /home) — extractList() handles either.
  async home(page = 1) {
    const json = await apiGet(`/anime/donghua/home/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  // Dedicated ongoing endpoint, kept as a separate method in case callers
  // want it directly instead of going through home().
  async ongoing(page = 1) {
    const json = await apiGet(`/anime/donghua/ongoing/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async completed(page = 1) {
    const json = await apiGet(`/anime/donghua/completed/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async latest(page = 1) {
    const json = await apiGet(`/anime/donghua/latest/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async schedule() {
    const json = await apiGet('/anime/donghua/schedule');
    const d = unwrapData(json);

    // Confirmed real shape: { status, creator, schedule: [{ day: "Wednesday",
    // donghua_list: [...] }, ...] } — a wrapper array of day-groups, NOT a
    // flat object keyed by day name like the earlier defensive guess
    // assumed. That guess accidentally matched on the "schedule" key itself
    // (since it IS an array) and mapped its {day, donghua_list} objects as
    // if they were donghua items, silently producing an empty result.
    if (d && Array.isArray(d.schedule)) {
      const result = {};
      for (const entry of d.schedule) {
        const day = pick(entry, ['day', 'hari', 'weekday'], null);
        const items = entry.donghua_list || entry.list || entry.items;
        if (day && Array.isArray(items)) {
          result[day] = items.map(mapListItem).filter(Boolean);
        }
      }
      if (Object.keys(result).length) return result;
    }

    // Fallback for other possible shapes (unconfirmed, defensive only).
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const result = {};
      for (const [key, val] of Object.entries(d)) {
        if (key === 'schedule') continue; // already handled above if applicable
        if (Array.isArray(val)) result[key] = val.map(mapListItem).filter(Boolean);
      }
      if (Object.keys(result).length) return result;
    }
    const list = extractList(json);
    if (list.length) {
      const result = {};
      for (const item of list) {
        const day = pick(item, ['day', 'hari', 'weekday'], 'Lainnya');
        if (!result[day]) result[day] = [];
        const mapped = mapListItem(item);
        if (mapped) result[day].push(mapped);
      }
      return result;
    }
    return {};
  }

  async search(query, page = 1) {
    const json = await apiGet(`/anime/donghua/search/${encodeURIComponent(query)}/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  // A-Z listing by starting letter — bonus endpoint not in the old scraper.
  async azList(letter, page = 1) {
    const json = await apiGet(`/anime/donghua/az-list/${encodeURIComponent(letter)}/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async genres() {
    const json = await apiGet('/anime/donghua/genres');
    const list = extractList(json);
    return list.map((g) => ({
      name: pick(g, ['name', 'title', 'genre'], typeof g === 'string' ? g : ''),
      slug: pick(g, ['slug', 'id'], typeof g === 'string' ? g : null)
    })).filter((g) => g.slug);
  }

  async genreDonghua(genreSlug, page = 1) {
    const json = await apiGet(`/anime/donghua/genres/${encodeURIComponent(genreSlug)}/${page}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async seasons(year) {
    const json = await apiGet(`/anime/donghua/seasons/${encodeURIComponent(year)}`);
    const items = extractList(json).map(mapListItem).filter(Boolean);
    return { items };
  }

  async detail(slug) {
    const json = await apiGet(`/anime/donghua/detail/${encodeURIComponent(slug)}`);
    const d = unwrapData(json);
    const info = d.donghua_details || d;
    const genreRaw = pick(info, ['genre', 'genres', 'category'], []);
    const genreObjs = Array.isArray(genreRaw) ? genreRaw : genreRaw ? [genreRaw] : [];
    const genres = genreObjs.map((g) => (typeof g === 'object' ? pick(g, ['name'], '') : g)).filter(Boolean);
    const genreSlugs = genreObjs
      .map((g) => (typeof g === 'object' ? pick(g, ['slug', 'id'], null) : null))
      .filter(Boolean);

    const candidates = ['episodes_list', 'episode_list', 'episodeList', 'episodes', 'list_episode', 'listEpisode', 'daftar_episode'];
    let episodesRaw = [];
    for (const key of candidates) {
      if (Array.isArray(d[key])) { episodesRaw = d[key]; break; }
    }
    if (!episodesRaw.length) {
      for (const val of Object.values(d)) {
        if (Array.isArray(val) && val.length && typeof val[0] === 'object') { episodesRaw = val; break; }
      }
    }

    // The API has no recommended/related field at all (confirmed via
    // rawDetail — only title/poster/genres/synopsis/episodes_list exist).
    // Approximate it ourselves: pull other titles sharing this donghua's
    // first genre, excluding itself. Best-effort — swallow failures so a
    // broken genre fetch never breaks the whole detail page.
    let recommended = [];
    if (genreSlugs[0]) {
      try {
        const genreRes = await this.genreDonghua(genreSlugs[0], 1);
        recommended = (genreRes.items || [])
          .filter((it) => it.slug && it.slug !== slug)
          .slice(0, 10)
          .map((it) => ({ title: it.title, slug: it.slug, poster: it.image || null }));
      } catch {
        recommended = [];
      }
    }

    return {
      slug,
      title: pick(info, ['title', 'judul', 'name'], 'Tanpa Judul'),
      image: pick(info, ['poster', 'thumbnail', 'thumb', 'image', 'img', 'cover', 'gambar']),
      synopsis: pick(info, ['synopsis', 'sinopsis', 'description', 'desc']),
      status: pick(info, ['status', 'type_status'], 'Ongoing'),
      genres,
      episodesList: episodesRaw.map((ep) => ({
        title: pick(ep, ['title', 'episode', 'name'], 'Episode'),
        slug: getEpisodeSlugFrom(ep)
      })).filter((e) => e.slug),
      recommended
    };
  }

  // Debug-only: returns the raw unwrapped API object with no field mapping,
  // so we can see the actual key names the API uses (e.g. for a
  // recommended/related-anime list) before writing extraction logic for it.
  async rawDetail(slug) {
    const json = await apiGet(`/anime/donghua/detail/${encodeURIComponent(slug)}`);
    return unwrapData(json);
  }

  async episode(slug) {
    const json = await apiGet(`/anime/donghua/episode/${encodeURIComponent(slug)}`);
    const d = unwrapData(json);

    let servers = [];
    if (d.streaming && Array.isArray(d.streaming.servers)) {
      servers = d.streaming.servers.map((s) => ({ label: pick(s, ['name'], 'Server'), url: pick(s, ['url']) }));
    } else {
      for (const key of ['servers', 'server_list', 'streaming_servers']) {
        if (Array.isArray(d[key])) {
          servers = d[key].map((s) => ({ label: pick(s, ['name', 'label'], 'Server'), url: pick(s, ['url', 'link']) }));
          break;
        }
      }
    }
    servers = servers.filter((s) => /^https?:\/\//i.test(s.url || ''));

    let defaultPlayer = null;
    if (d.streaming?.main_url?.url) defaultPlayer = d.streaming.main_url.url;
    else if (servers.length) defaultPlayer = servers[0].url;
    else defaultPlayer = pick(d, ['stream_url', 'streamUrl', 'embed', 'embed_url', 'player', 'video_url', 'videoUrl']);
    if (!/^https?:\/\//i.test(defaultPlayer || '')) defaultPlayer = servers[0]?.url || null;

    const downloads = [];
    // Anichin's own data sometimes leaves a broken/placeholder string as the
    // provider key (e.g. "Proses server error") even when the URL itself is
    // a perfectly working link — so don't drop those, just relabel from the
    // URL's actual host instead of trusting a key that isn't a real name.
    function deriveProviderLabel(key, url) {
      if (key && !/error|proses|gagal|pending|unknown/i.test(key)) return key;
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        if (/terabox|1024tera|momerybox|4funbox|teraboxapp/i.test(host)) return 'Terabox';
        if (/mirrored\.to/i.test(host)) return 'Mirrored';
        return host; // fallback: show the domain itself — still useful info
      } catch {
        return key || 'Download';
      }
    }

    const dl = d.download_url || d.download || d.downloads;
    if (dl && typeof dl === 'object' && !Array.isArray(dl)) {
      for (const [quality, providers] of Object.entries(dl)) {
        if (providers && typeof providers === 'object' && !Array.isArray(providers)) {
          const links = Object.entries(providers)
            // Only drop entries where the URL itself is missing/invalid —
            // a weird label alone isn't a reason to hide a working link.
            .filter(([, url]) => /^https?:\/\//i.test(url || ''))
            .map(([provider, url]) => ({ label: deriveProviderLabel(provider, url), url }));
          // Confirmed key format: "download_url_360p", "download_url_480p", etc.
          downloads.push({
            subtitle: quality.replace(/^(mp4_)?download_url_/i, '').toUpperCase(),
            links,
            unavailable: links.length === 0
          });
        }
      }
    }

    let seriesSlug = null;
    let seriesTitle = null;
    let seriesImage = null;
    if (d.donghua_details) {
      seriesTitle = pick(d.donghua_details, ['title'], null);
      seriesSlug = getSeriesSlugFrom(d.donghua_details);
      seriesImage = pick(d.donghua_details, ['poster', 'thumbnail', 'thumb', 'image', 'img', 'cover', 'gambar']);
    }

    // Confirmed field: navigation.previous_episode / navigation.next_episode,
    // each { episode, slug, href, anichinUrl }. Not consumed by watch-ac's
    // page.js yet — exposed here so a next/prev button can be wired up later.
    let previousEpisode = null;
    let nextEpisode = null;
    if (d.navigation) {
      if (d.navigation.previous_episode) {
        previousEpisode = {
          title: pick(d.navigation.previous_episode, ['episode', 'title'], 'Episode'),
          slug: getEpisodeSlugFrom(d.navigation.previous_episode)
        };
      }
      if (d.navigation.next_episode) {
        nextEpisode = {
          title: pick(d.navigation.next_episode, ['episode', 'title'], 'Episode'),
          slug: getEpisodeSlugFrom(d.navigation.next_episode)
        };
      }
    }

    return {
      title: pick(d, ['title', 'episode'], 'Episode'),
      defaultPlayer,
      servers,
      downloads,
      seriesTitle,
      seriesSlug,
      seriesImage,
      previousEpisode,
      nextEpisode
    };
  }
}

module.exports = new AnichinScraper();
module.exports.AnichinScraper = AnichinScraper;
