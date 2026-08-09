const axios = require('axios');

// Unlike the other lib/*Scraper.js files, this isn't HTML scraping — it's a
// thin client for a ready-made JSON API (sankavollerei.web.id) that itself
// wraps Otakudesu. No cheerio, no user-agent rotation needed; just fetch +
// unwrap `.data`, with a small retry for transient network hiccups.
const BASE_URL = 'https://www.sankavollerei.web.id/anime';

// Simple in-memory cache — survives across requests as long as the
// serverless function stays warm, cutting real navigation lag (not just
// perceived, via loading.js skeletons) for repeat visits to the same data.
const cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;

// Rate limiter — Sanka bans after exceeding 50 req/min, so we cap ourselves
// at 35/min (comfortable buffer) using a sliding window. Requests over the
// limit wait in line instead of firing immediately. This only protects a
// single warm serverless instance (no shared store across instances), but
// combined with the cache above it meaningfully cuts real request volume.
const REQUEST_LIMIT = 40;
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

async function get(path, retries = 3) {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  await waitForSlot();

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`${BASE_URL}${path}`, { timeout: 15000 });
      if (!res.data || res.data.ok === false) {
        throw new Error(res.data?.message || 'Sanka API returned ok:false');
      }
      cache.set(path, { data: res.data.data, time: Date.now() });
      return res.data.data;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

class SankaScraper {
  // Home: { ongoing: { animeList: [...] }, completed: { animeList: [...] } }
  async home() {
    return get('/home');
  }

  async ongoing(page = 1) {
    return get(`/ongoing-anime?page=${page}`);
  }

  async completed(page = 1) {
    return get(`/complete-anime?page=${page}`);
  }

  async schedule() {
    return get('/schedule');
  }

  // animeId comes from card hrefs, e.g. "neko-ryuu-sub-indo"
  async detail(animeId) {
    return get(`/anime/${animeId}`);
  }

  // episodeId comes from detail().episodeList[].episodeId, e.g. "ntru-episode-1-sub-indo"
  // Result includes `defaultStreamingUrl` (ready-to-embed iframe src) plus
  // server.qualities[].serverList[] for picking a specific resolution/server.
  async episode(episodeId) {
    return get(`/episode/${episodeId}`);
  }

  // serverId comes from episode().server.qualities[].serverList[].serverId
  async server(serverId) {
    return get(`/server/${serverId}`);
  }

  async genres() {
    return get('/genre');
  }

  async genreAnime(genreId, page = 1) {
    return get(`/genre/${genreId}?page=${page}`);
  }

  async search(query) {
    return get(`/search/${encodeURIComponent(query)}`);
  }
}

module.exports = new SankaScraper();
module.exports.SankaScraper = SankaScraper;