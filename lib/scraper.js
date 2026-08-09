const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const BASE_URL = 'https://animexin.dev';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

let uaIndex = 0;

function getHeaders(ref) {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex++;
  const isMobile = ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android');
  const platform = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : 'Linux';
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': ref || BASE_URL,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1',
    'Sec-Ch-Ua': `"${ua.includes('Chrome') ? 'Google Chrome' : 'Chromium'}"`,
    'Sec-Ch-Ua-Mobile': isMobile ? '?1' : '?0',
    'Sec-Ch-Ua-Platform': `"${platform}"`,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive'
  };
}

function randomDelay(min = 300, max = 800) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

async function fetchHTML(url, retries = 5, ref = null, timeout = 30000) {
  for (let i = 0; i < retries; i++) {
    try {
      await randomDelay(300, 800);
      const res = await axios({
        url,
        method: 'GET',
        headers: getHeaders(ref || url),
        timeout,
        httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: true }),
        maxRedirects: 5,
        decompress: true,
        validateStatus: status => status >= 200 && status < 400
      });
      return res.data;
    } catch (e) {
      if (i < retries - 1) await randomDelay(1500, 4000);
      else throw e;
    }
  }
}

function normalizeUrl(input) {
  if (!input) return null;
  if (input.startsWith('http')) return input;
  if (input.startsWith('//')) return `https:${input}`;
  return `${BASE_URL}/${input.replace(/^\//, '')}`;
}

class AnimeXinScraper {
  constructor() {
    this.base = BASE_URL;
  }

  _clean(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) return obj.map(i => this._clean(i));
    if (typeof obj === 'object') {
      const result = {};
      for (const key of Object.keys(obj)) {
        const val = this._clean(obj[key]);
        if (val !== undefined) result[key] = val;
      }
      return Object.keys(result).length ? result : undefined;
    }
    return obj;
  }

  _parsePagination($) {
    const result = { current: 1, next: null, hasNext: false, total: null };
    const pageLinks = [];
    $('.pagination a, .pagination span, .page-numbers, .hpage a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) pageLinks.push({ text, href });
    });
    const numbers = pageLinks.filter(l => /^\d+$/.test(l.text)).map(l => parseInt(l.text));
    if (numbers.length) result.total = Math.max(...numbers);
    const current = $('.pagination .page-numbers.current, .hpage .current').first();
    if (current.length) {
      const t = current.text().trim();
      if (/^\d+$/.test(t)) result.current = parseInt(t);
    }
    if (result.total && result.current < result.total) {
      result.hasNext = true;
      const nextLink = pageLinks.find(l => l.text === 'Next' || l.text === '»' || l.text.toLowerCase().includes('next'));
      if (nextLink && nextLink.href) {
        result.next = normalizeUrl(nextLink.href);
      }
    }
    return result;
  }

  _parseEpisodeList($) {
    const episodes = [];
    $('.eplister ul li').each((i, el) => {
      const $el = $(el);
      const link = $el.find('a');
      const href = link.attr('href');
      const epNum = $el.find('.epl-num').text().trim();
      const title = $el.find('.epl-title').text().trim();
      const sub = $el.find('.epl-sub .status').text().trim();
      const date = $el.find('.epl-date').text().trim();
      if (href && epNum) {
        episodes.push({
          episode: epNum,
          title: title || epNum,
          sub: sub || 'Sub',
          date: date || null,
          url: normalizeUrl(href)
        });
      }
    });
    return episodes;
  }

  _parseServers($) {
    const servers = [];
    $('.mirror option').each((i, el) => {
      const value = $(el).attr('value');
      const label = $(el).text().trim();
      if (value && label && label !== 'Select Video Server') {
        let iframeSrc = null;
        try {
          const decoded = Buffer.from(value, 'base64').toString('utf-8');
          const iframeMatch = decoded.match(/src="([^"]+)"/);
          if (iframeMatch) iframeSrc = iframeMatch[1];
        } catch (e) {}
        servers.push({
          label,
          url: iframeSrc || null
        });
      }
    });
    return servers;
  }

  _parseDownloadLinks($) {
    const downloads = [];
    $('.soraddlx').each((i, el) => {
      const subtitle = $(el).find('.sorattlx h3').text().trim();
      const links = [];
      $(el).find('.soraurlx a').each((j, link) => {
        const label = $(link).text().trim();
        const href = $(link).attr('href');
        if (label && href && label !== 'Membership VIP' && !href.includes('ko-fi')) {
          links.push({ label, url: href });
        }
      });
      if (subtitle && links.length) {
        downloads.push({ subtitle, links });
      }
    });
    return downloads;
  }

  _buildResponse(page, url, data) {
    return this._clean({ page, url, data });
  }

  async home(page = 1) {
    const url = page === 1 ? this.base : `${this.base}/page/${page}/`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const schedule = [];
    $('.listSchh').each((i, el) => {
      const day = $(el).find('h2').text().trim();
      const animeList = [];
      $(el).find('.subSchh a').each((j, link) => {
        const title = $(link).text().trim();
        const href = $(link).attr('href');
        if (title && href && href !== '#') {
          animeList.push({ title, url: normalizeUrl(href) });
        }
      });
      if (day && animeList.length) schedule.push({ day, animeList });
    });

    const latestReleases = [];
    $('.styleegg').each((i, el) => {
      const title = $(el).find('.eggtitle').text().trim() || $(el).find('.tt h2').text().trim();
      const episode = $(el).find('.eggepisode').text().trim();
      const type = $(el).find('.eggtype').text().trim();
      const link = $(el).find('a');
      const href = link.attr('href');
      const img = $(el).find('img').attr('src');
      if (title && href) {
        latestReleases.push({
          title,
          episode: episode || 'Ongoing',
          type: type || 'ONA',
          url: normalizeUrl(href),
          image: img || null
        });
      }
    });

    const popular = { weekly: [], monthly: [], allTime: [] };
    const popTypes = [
      { sel: '.wpop-weekly .leftseries', key: 'weekly' },
      { sel: '.wpop-monthly .leftseries', key: 'monthly' },
      { sel: '.wpop-alltime .leftseries', key: 'allTime' }
    ];
    popTypes.forEach(({ sel, key }) => {
      $(sel).each((i, el) => {
        const title = $(el).find('h4 a').text().trim();
        const href = $(el).find('h4 a').attr('href');
        const genres = $(el).find('span a').map((_, g) => $(g).text().trim()).get();
        const rating = $(el).find('.numscore').text().trim();
        // The poster image usually lives in a sibling element (e.g. ".imgseries")
        // next to ".leftseries" rather than inside it, so look at the nearest
        // shared container first and fall back to broader ancestors.
        let image = null;
        const containers = [$(el).parent(), $(el).closest('li'), $(el).parent().parent()];
        for (const c of containers) {
          if (image || !c || !c.length) continue;
          const img = c.find('img').first();
          if (img.length) {
            image = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || null;
          }
        }
        if (title && href) {
          popular[key].push({ title, url: normalizeUrl(href), genres, rating: rating || null, image: image ? normalizeUrl(image) : null });
        }
      });
    });

    return this._buildResponse('home', url, { schedule, latestReleases, popular });
  }

  async list(order = 'update', page = 1) {
    const url = page === 1
      ? `${this.base}/anime/?order=${order}`
      : `${this.base}/anime/page/${page}/?order=${order}`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const animeList = [];
    $('.bsx').each((i, el) => {
      const link = $(el).find('a');
      const title = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      const type = $(el).find('.typez').text().trim();
      const status = $(el).find('.bt .epx').text().trim() || $(el).find('.status').text().trim();
      const sub = $(el).find('.bt .sb').text().trim();
      const img = $(el).find('img').attr('src');
      const rating = $(el).find('.numscore').text().trim();
      const genres = $(el).find('.tt span a').map((_, g) => $(g).text().trim()).get();
      if (title && href) {
        animeList.push({
          title, url: normalizeUrl(href), type: type || 'ONA', status: status || 'Ongoing',
          sub: sub || 'Sub', image: img || null, rating: rating || null, genres
        });
      }
    });

    const pagination = this._parsePagination($);
    return this._buildResponse('list', url, { order, pagination, animeList });
  }

  async detail(input) {
    const url = normalizeUrl(input);
    if (!url) throw new Error('Invalid URL or slug');
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const title = $('.infox h1').text().trim() || $('.entry-title').text().trim();
    const altTitle = $('.alter').text().trim() || null;
    const poster = $('.thumb img').attr('src') || $('.bigcover .ime img').attr('src') || null;
    const status = $('.spe span:contains("Status:")').text().replace('Status:', '').trim() || 'Ongoing';
    const network = $('.spe a[rel="tag"]').first().text().trim() || null;
    const networkUrl = $('.spe a[rel="tag"]').first().attr('href') ? normalizeUrl($('.spe a[rel="tag"]').first().attr('href')) : null;
    const released = $('.spe span:contains("Released:")').text().replace('Released:', '').trim() || null;
    const duration = $('.spe span:contains("Duration:")').text().replace('Duration:', '').trim() || null;
    const season = $('.spe a[rel="tag"]').eq(1).text().trim() || null;
    const country = $('.spe a[rel="tag"]').eq(2).text().trim() || null;
    const type = $('.spe span:contains("Type:")').text().replace('Type:', '').trim() || 'ONA';
    const episodes = $('.spe span:contains("Episodes:")').text().replace('Episodes:', '').trim() || null;
    const fansub = $('.spe span:contains("Fansub:")').text().replace('Fansub:', '').trim() || null;
    const postedBy = $('.spe .fn').text().trim() || null;
    const releasedOn = $('.spe span:contains("Released on:") .updated').text().trim() || null;
    const updatedOn = $('.spe span:contains("Updated on:") .updated').text().trim() || null;

    const genres = $('.genxed a').map((_, el) => $(el).text().trim()).get();
    const tags = $('.tags a').map((_, el) => $(el).text().trim()).get();
    const NOISE_LABELS = new Set(['indo', 'indonesia', 'eng', 'english', 'jp', 'japan', 'cn', 'china', 'read more', 'baca selengkapnya']);
    const synopsisCandidates = [];
    $('.entry-content p, .synp .entry-content p, .synopsis p, .desc p').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 20 && !NOISE_LABELS.has(t.toLowerCase())) synopsisCandidates.push(t);
    });
    const synopsis = synopsisCandidates.sort((a, b) => b.length - a.length)[0] || '';

    const episodesList = this._parseEpisodeList($);
    const rating = $('.wpd-rating-value .wpdrv').text().trim() || null;
    const ratingCount = $('.wpd-rating-value .wpdrc').text().trim() || null;

    let prevEpisode = null;
    let nextEpisode = null;
    const prevLink = $('.naveps .nvs:first-child a');
    const nextLink = $('.naveps .nvs:last-child a');
    if (prevLink.length && prevLink.attr('href')) prevEpisode = normalizeUrl(prevLink.attr('href'));
    if (nextLink.length && nextLink.attr('href') && !nextLink.text().includes('Next')) nextEpisode = normalizeUrl(nextLink.attr('href'));

    const recommended = [];
    $('.listupd .bs').slice(0, 10).each((i, el) => {
      const link = $(el).find('a');
      const titleRec = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      const posterRec = $(el).find('img').attr('src');
      if (titleRec && href) recommended.push({ title: titleRec, url: normalizeUrl(href), poster: posterRec || null });
    });

    return this._buildResponse('detail', url, {
      title, altTitle, poster, status, network, networkUrl, released, duration, season, country, type,
      episodes, fansub, postedBy, releasedOn, updatedOn, genres, tags, synopsis: synopsis || null,
      rating, ratingCount, episodesList, prevEpisode, nextEpisode, recommended
    });
  }

  async episode(input) {
    const url = normalizeUrl(input);
    if (!url) throw new Error('Invalid URL or slug');
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const title = $('.entry-title').text().trim() || $('.title-section h1').text().trim();
    const seriesName = $('.single-info .infolimit h2').text().trim() || $('.single-info .spe span:contains("Series:") a').text().trim();
    const seriesUrl = $('.single-info .infolimit h2 a').attr('href') || null;
    const poster = $('.thumb img').attr('src') || $('.meta .tb img').attr('src') || null;
    const type = $('.epx').text().trim() || 'ONA';
    const sub = $('.lg').text().trim() || 'Sub';
    const releasedOn = $('.updated').text().trim() || null;
    const postedBy = $('.vcard .fn').text().trim() || null;

    const defaultPlayer = $('.player-embed iframe').attr('src') || null;
    let defaultVideoId = null;
    if (defaultPlayer) {
      try {
        const params = new URLSearchParams(new URL(defaultPlayer).search);
        defaultVideoId = params.get('video');
      } catch (e) {}
    }

    const servers = this._parseServers($);
    const downloads = this._parseDownloadLinks($);

    let prevEpisode = null;
    let nextEpisode = null;
    const prevLink = $('.naveps .nvs:first-child a');
    const nextLink = $('.naveps .nvs:last-child a');
    if (prevLink.length && prevLink.attr('href')) prevEpisode = normalizeUrl(prevLink.attr('href'));
    if (nextLink.length && nextLink.attr('href') && !nextLink.text().includes('Next')) nextEpisode = normalizeUrl(nextLink.attr('href'));

    const allEpisodesUrl = $('.naveps .nvsc a').attr('href') || null;
    const description = $('.entry-content .infx p').text().trim() || null;

    const otherEpisodes = [];
    $('.listupd .bsx').slice(0, 10).each((i, el) => {
      const link = $(el).find('a');
      const titleEp = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      if (titleEp && href && href !== url) otherEpisodes.push({ title: titleEp, url: normalizeUrl(href) });
    });

    return this._buildResponse('episode', url, {
      title, seriesName: seriesName || null, seriesUrl: normalizeUrl(seriesUrl), poster, type, sub,
      releasedOn, postedBy, defaultPlayer, defaultVideoId, servers, downloads, prevEpisode, nextEpisode,
      allEpisodesUrl: normalizeUrl(allEpisodesUrl), description, otherEpisodes
    });
  }

  async genres() {
    const html = await fetchHTML(`${this.base}/genres/`);
    const $ = cheerio.load(html);
    const genres = [];
    $('.taxindex li a').each((i, el) => {
      const name = $(el).find('.name').text().trim();
      const count = $(el).find('.count').text().trim();
      const href = $(el).attr('href');
      if (name && href) genres.push({ name, count: parseInt(count) || 0, url: normalizeUrl(href) });
    });
    return this._buildResponse('genres', `${this.base}/genres/`, { total: genres.length, genres });
  }

  async genre(input, page = 1) {
    const slug = input.replace(`${this.base}/genres/`, '').replace(/\/$/, '').replace(/\/page\/\d+/, '');
    const url = page === 1 ? `${this.base}/genres/${slug}/` : `${this.base}/genres/${slug}/page/${page}/`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const animeList = [];
    $('.bsx').each((i, el) => {
      const link = $(el).find('a');
      const title = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      const type = $(el).find('.typez').text().trim();
      const status = $(el).find('.bt .epx').text().trim() || $(el).find('.status').text().trim();
      const sub = $(el).find('.bt .sb').text().trim();
      const img = $(el).find('img').attr('src');
      if (title && href) {
        animeList.push({ title, url: normalizeUrl(href), type: type || 'ONA', status: status || 'Ongoing', sub: sub || 'Sub', image: img || null });
      }
    });

    const pagination = this._parsePagination($);
    return this._buildResponse('genre', url, { slug, pagination, animeList });
  }

  async release() {
    const html = await fetchHTML(`${this.base}/release-date/`);
    const $ = cheerio.load(html);
    const schedule = {};
    $('.schedulepage').each((i, el) => {
      const day = $(el).find('.releases h3 span').text().trim();
      const animeList = [];
      $(el).find('.bsx').each((j, item) => {
        const link = $(item).find('a');
        const title = $(item).find('.tt').text().trim();
        const href = link.attr('href');
        const time = $(item).find('.cndwn').text().trim() || $(item).find('.epx').text().trim();
        const episode = $(item).find('.epx').text().trim();
        const sub = $(item).find('.sb').text().trim();
        const img = $(item).find('img').attr('src');
        const rlsdt = $(item).find('.cndwn').attr('data-rlsdt') || null;
        const cndwn = $(item).find('.cndwn').attr('data-cndwn') || null;
        if (title && href) {
          animeList.push({
            title, url: normalizeUrl(href), time: time || 'Unknown', episode: episode || null,
            sub: sub || 'Sub', image: img || null,
            releaseTimestamp: rlsdt ? parseInt(rlsdt) : null,
            countdown: cndwn ? parseInt(cndwn) : null
          });
        }
      });
      if (day && animeList.length) schedule[day] = animeList;
    });
    return this._buildResponse('release', `${this.base}/release-date/`, { schedule });
  }

  async studios() {
    // Mirrors genres() — some sites in this theme family expose a studio
    // taxonomy archive, but the exact URL prefix varies by install. We probe
    // a few plausible ones IN PARALLEL (short timeout, single attempt each)
    // so a site with none of these paths fails fast instead of stacking up
    // sequential timeouts.
    const candidates = ['studio', 'studios', 'network', 'production'];
    const attempts = await Promise.allSettled(
      candidates.map(async (path) => {
        const html = await fetchHTML(`${this.base}/${path}/`, 1, null, 5000);
        const $ = cheerio.load(html);
        const studios = [];
        $('.taxindex li a').each((i, el) => {
          const name = $(el).find('.name').text().trim();
          const count = $(el).find('.count').text().trim();
          const href = $(el).attr('href');
          if (name && href) studios.push({ name, count: parseInt(count) || 0, url: normalizeUrl(href) });
        });
        if (!studios.length) throw new Error('empty');
        return { path, studios };
      })
    );
    const hit = attempts.find((a) => a.status === 'fulfilled');
    if (hit) {
      const { path, studios } = hit.value;
      return this._buildResponse('studios', `${this.base}/${path}/`, { total: studios.length, studios });
    }
    throw new Error('No studio taxonomy archive found on this source');
  }

  async studioDetail(input, page = 1) {
    // input can be a slug or a full URL (e.g. the real networkUrl scraped
    // from a detail page — always the most accurate option).
    const isFull = /^https?:\/\//.test(input);
    const base = isFull ? input.replace(/\/$/, '') : `${this.base}/studio/${input.replace(/^\/|\/$/g, '')}`;
    const url = page === 1 ? `${base}/` : `${base}/page/${page}/`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const animeList = [];
    $('.bsx').each((i, el) => {
      const link = $(el).find('a');
      const title = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      const type = $(el).find('.typez').text().trim();
      const status = $(el).find('.bt .epx').text().trim() || $(el).find('.status').text().trim();
      const sub = $(el).find('.bt .sb').text().trim();
      const img = $(el).find('img').attr('src');
      if (title && href) {
        animeList.push({ title, url: normalizeUrl(href), type: type || 'ONA', status: status || 'Ongoing', sub: sub || 'Sub', image: img || null });
      }
    });

    const pagination = this._parsePagination($);
    return this._buildResponse('studioDetail', url, { pagination, animeList });
  }

  async search(query, page = 1) {
    const url = page === 1
      ? `${this.base}/?s=${encodeURIComponent(query)}`
      : `${this.base}/page/${page}/?s=${encodeURIComponent(query)}`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const results = [];
    $('.bsx').each((i, el) => {
      const link = $(el).find('a');
      const title = $(el).find('.tt h2').text().trim() || $(el).find('.tt').text().trim();
      const href = link.attr('href');
      const type = $(el).find('.typez').text().trim();
      const status = $(el).find('.bt .epx').text().trim() || $(el).find('.status').text().trim();
      const sub = $(el).find('.bt .sb').text().trim();
      const img = $(el).find('img').attr('src');
      if (title && href) {
        results.push({ title, url: normalizeUrl(href), type: type || 'ONA', status: status || 'Ongoing', sub: sub || 'Sub', image: img || null });
      }
    });

    const pagination = this._parsePagination($);
    return this._buildResponse('search', url, { query, pagination, results });
  }
}

module.exports = new AnimeXinScraper();
module.exports.AnimeXinScraper = AnimeXinScraper;
