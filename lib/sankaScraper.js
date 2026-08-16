const axios = require('axios');

// Unlike the other lib/*Scraper.js files, this isn't HTML scraping — it's a
// thin client for a ready-made JSON API (sankavollerei.web.id) that wraps
// multiple anime sites (Otakudesu, Samehadaku, ...). No cheerio, no
// user-agent rotation needed; just fetch + unwrap `.data`, with a small
// retry for transient network hiccups.
//
// Otakudesu sits at the API root (/anime/*). Samehadaku hangs off
// /anime/samehadaku/* and uses slightly different endpoint names in a few
// spots (confirmed against Sanka's docs) — that's why each site gets its
// own `paths` map below instead of assuming a shared shape.
const API_ROOT = 'https://www.sankavollerei.web.id/anime';

const SITE_CONFIGS = {
  otakudesu: {
    basePath: '',
    paths: {
      home: () => '/home',
      ongoing: (page = 1) => `/ongoing-anime?page=${page}`,
      completed: (page = 1) => `/complete-anime?page=${page}`,
      schedule: () => '/schedule',
      detail: (animeId) => `/anime/${animeId}`,
      episode: (episodeId) => `/episode/${episodeId}`,
      server: (serverId) => `/server/${serverId}`,
      genres: () => '/genre',
      genreAnime: (genreId, page = 1) => `/genre/${genreId}?page=${page}`,
      search: (query) => `/search/${encodeURIComponent(query)}`
    }
  },
  samehadaku: {
    basePath: '/samehadaku',
    paths: {
      home: () => '/home',
      ongoing: (page = 1) => `/ongoing?page=${page}`,
      completed: (page = 1) => `/completed?page=${page}&order=latest`,
      schedule: () => '/schedule',
      detail: (animeId) => `/anime/${animeId}`,
      episode: (episodeId) => `/episode/${episodeId}`,
      server: (serverId) => `/server/${serverId}`,
      genres: () => '/genres',
      genreAnime: (genreId, page = 1) => `/genres/${genreId}?page=${page}`,
      search: (query) => `/search?q=${encodeURIComponent(query)}&page=1`
    }
  }
};

// Rate limiter — Sanka bans after exceeding 50 req/min, so we cap ourselves
// at 35/min (comfortable buffer) using a sliding window per site (each site
// gets its own budget since they're independent upstreams).
const REQUEST_LIMIT = 40;
const WINDOW_MS = 60 * 1000;
const CACHE_TTL_MS = 3 * 60 * 1000;

function createSankaScraper(site = 'otakudesu') {
  const config = SITE_CONFIGS[site] || SITE_CONFIGS.otakudesu;
  const BASE_URL = `${API_ROOT}${config.basePath}`;
  const paths = config.paths;

  const cache = new Map();
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
      return get(paths.home());
    }

    async ongoing(page = 1) {
      return get(paths.ongoing(page));
    }

    async completed(page = 1) {
      return get(paths.completed(page));
    }

    async schedule() {
      return get(paths.schedule());
    }

    // animeId comes from card hrefs, e.g. "neko-ryuu-sub-indo"
    async detail(animeId) {
      return get(paths.detail(animeId));
    }

    // episodeId comes from detail().episodeList[].episodeId, e.g. "ntru-episode-1-sub-indo"
    // Result includes `defaultStreamingUrl` (ready-to-embed iframe src) plus
    // server.qualities[].serverList[] for picking a specific resolution/server.
    async episode(episodeId) {
      return get(paths.episode(episodeId));
    }

    // serverId comes from episode().server.qualities[].serverList[].serverId
    async server(serverId) {
      return get(paths.server(serverId));
    }

    async genres() {
      return get(paths.genres());
    }

    async genreAnime(genreId, page = 1) {
      return get(paths.genreAnime(genreId, page));
    }

    async search(query) {
      return get(paths.search(query));
    }
  }

  return new SankaScraper();
}

// Default export stays the Otakudesu client — every existing `import sanka
// from '../lib/sankaScraper'` keeps working unchanged.
const sanka = createSankaScraper('otakudesu');

module.exports = sanka;
module.exports.createSankaScraper = createSankaScraper;
module.exports.SITE_CONFIGS = SITE_CONFIGS;
