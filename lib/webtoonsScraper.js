// Adapted from a Webtoons.com (official platform, /en/ + /id/ locales)
// scraper. Episode-list fetches are tried directly first (no proxy needed
// for server-side Next.js routes), with the CORS proxy as a fallback for
// search/detail where Webtoons more aggressively blocks datacenter IPs.
const axios = require('axios');
const cheerio = require('cheerio');

const WEBTOONS_BASE = 'https://www.webtoons.com';
const CORS_PROXY = 'https://cors.siputzx.my.id/';

const DESKTOP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

async function fetchHtml(path) {
  let url = path.startsWith('http') ? path : `${WEBTOONS_BASE}${path}`;
  url = `${CORS_PROXY}${url}`;
  const res = await axios.get(url, {
    timeout: 25000,
    headers: DESKTOP_HEADERS,
    validateStatus: () => true
  });
  if (res.status !== 200 || typeof res.data !== 'string') {
    throw new Error(`HTTP ${res.status} dari ${url}`);
  }
  return res.data;
}

// For episode list pages, try direct request first (no proxy) since these
// are server-side calls — CORS doesn't apply. Direct often returns the full
// paginated HTML that the proxy sometimes truncates. Falls back to proxy if
// Webtoons blocks the datacenter IP.
async function fetchEpisodeHtml(url) {
  const fullUrl = url.startsWith('http') ? url : `${WEBTOONS_BASE}${url}`;
  try {
    const res = await axios.get(fullUrl, {
      timeout: 20000,
      headers: DESKTOP_HEADERS,
      validateStatus: (s) => s === 200
    });
    if (typeof res.data === 'string' && res.data.length > 500) return res.data;
    throw new Error('direct returned empty/short response');
  } catch {
    // fallback to CORS proxy
    const proxied = `${CORS_PROXY}${fullUrl}`;
    const res = await axios.get(proxied, {
      timeout: 25000,
      headers: DESKTOP_HEADERS,
      validateStatus: () => true
    });
    if (res.status !== 200 || typeof res.data !== 'string') {
      throw new Error(`HTTP ${res.status} via proxy for ${fullUrl}`);
    }
    return res.data;
  }
}

// Webtoons.com loads its real panel/thumbnail images via client-side JS —
// a plain server-side fetch only ever sees this transparent placeholder in
// the raw HTML, never the real image URL. Filter it out so cards fall back
// to our normal "no image" placeholder instead of rendering an invisible
// blank image.
function realImageOrNull(src) {
  if (!src) return null;
  if (/bg_transparency|placeholder/i.test(src)) return null;
  return src;
}

function titleNoFromUrl(url) {
  const m = String(url).match(/[?&]title_no=(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseDetail($, sourceUrl) {
  const title = $('h1.subj, h3.subj, .info .subj').first().text().trim()
    || $('meta[property="og:title"]').attr('content') || null;
  const author = $('.author_area, .ly_creator_in .author, .author').first().text().trim() || null;
  const synopsis = $('p.summary, .detail_body .summary').first().text().trim()
    || $('meta[property="og:description"]').attr('content') || null;
  const genre = $('h2.genre, p.genre').first().text().trim() || null;
  const day = $('p.day_info, .day_info').first().text().replace(/\s+/g, ' ').trim() || null;
  const status = /completed|tamat|selesai/i.test(day || '') ? 'Complete' : /(every|setiap|UP)/i.test(day || '') ? 'Ongoing' : null;
  const ratingText = $('em#_starScoreAverage, .grade_area .grade_num').first().text().trim() || null;
  const rating = ratingText ? parseFloat(ratingText) || null : null;
  const subscribers = $('.grade_area em.cnt, .subscribe em.cnt').first().text().trim() || null;
  const thumbnail = realImageOrNull($('.detail_header .thmb img, .detail_bg img').first().attr('src'))
    || $('meta[property="og:image"]').attr('content') || null;

  return { titleNo: titleNoFromUrl(sourceUrl), title, author, synopsis, genre, day, status, rating, subscribers, thumbnail, url: sourceUrl };
}

class WebtoonsScraper {
  constructor() {
    this.base = WEBTOONS_BASE;
  }

  async search(query, limit = 20) {
    // Search both English and Indonesian locales — the /id/ catalog is much
    // smaller and many titles (e.g. originals in English) only appear under /en/.
    const [htmlEn, htmlId] = await Promise.allSettled([
      fetchHtml(`/en/search?keyword=${encodeURIComponent(query)}`),
      fetchHtml(`/id/search?keyword=${encodeURIComponent(query)}`)
    ]);

    function extractItems(html) {
      if (!html) return [];
      const $ = cheerio.load(html);
      const out = [];
      $("a[href*='/list?title_no=']").each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        if (!href) return;
        const absUrl = href.startsWith('http') ? href : `${WEBTOONS_BASE}${href}`;
        const titleNo = titleNoFromUrl(absUrl);
        if (!titleNo) return;
        const title = $a.find('strong.title, .info_text .title, p.subj, .subj').first().text().trim()
          || $a.attr('title')?.trim() || $a.find('img').attr('alt')?.trim() || '';
        const img = $a.find('img').first();
        const thumb = realImageOrNull(img.attr('data-src') || img.attr('data-original') || img.attr('src'));
        out.push({ titleNo, title, thumbnail: thumb, url: absUrl.split('&webtoon-platform-redirect')[0] });
      });
      return out;
    }

    const enItems = htmlEn.status === 'fulfilled' ? extractItems(htmlEn.value) : [];
    const idItems = htmlId.status === 'fulfilled' ? extractItems(htmlId.value) : [];

    // Merge, English results first, deduplicate by titleNo
    const seen = new Set();
    const merged = [];
    for (const it of [...enItems, ...idItems]) {
      if (seen.has(it.titleNo)) continue;
      seen.add(it.titleNo);
      merged.push(it);
      if (merged.length >= limit) break;
    }
    return merged;
  }

  async detail(url) {
    const html = await fetchHtml(url);
    return parseDetail(cheerio.load(html), url);
  }

  async episodes(url, page = 1) {
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}page=${page}`;
    const html = await fetchEpisodeHtml(fullUrl);
    const $ = cheerio.load(html);
    const list = [];

    $('#_listUl > li, ul#_listUl > li').each((_, el) => {
      const $li = $(el);
      const $a = $li.find('a').first();
      const href = $a.attr('href') || '';
      if (!href) return;
      const epUrl = href.startsWith('http') ? href : `${WEBTOONS_BASE}${href}`;
      const epNo = Number($li.attr('data-episode-no')) || Number(epUrl.match(/episode_no=(\d+)/)?.[1]) || null;
      const epTitle = $a.find('.subj span, .subj').first().text().trim() || $a.attr('title')?.trim() || '';
      const thumb = realImageOrNull($a.find('.thmb img').first().attr('src'));
      list.push({ episodeNo: epNo, title: epTitle, thumbnail: thumb, url: epUrl });
    });

    let totalPages = page;
    $('div.paginate a, .paginate a').each((_, el) => {
      const t = Number($(el).text().trim());
      if (Number.isFinite(t) && t > totalPages) totalPages = t;
    });

    const meta = parseDetail($, url);
    return { ...meta, page, totalPages, hasNext: page < totalPages, episodesList: list.reverse() };
  }

  async trending(day = 'daily') {
    const d = (day || 'daily').toLowerCase();
    const path = d === 'daily' || d === 'trending' ? '/id/dailySchedule' : d === 'completed' ? '/id/originals/completed' : `/id/originals/${d}`;
    const html = await fetchHtml(`${WEBTOONS_BASE}${path}`);
    const $ = cheerio.load(html);
    const items = [];

    $("a[href*='/list?title_no=']").each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      if (!href) return;
      const absUrl = href.startsWith('http') ? href : `${WEBTOONS_BASE}${href}`;
      const titleNo = titleNoFromUrl(absUrl);
      if (!titleNo) return;
      const title = $a.find('.subj, p.subj, .info .subj, strong.title').first().text().trim()
        || $a.attr('title')?.trim() || $a.find('img').attr('alt')?.trim() || '';
      const img = $a.find('img').first();
      const thumb = realImageOrNull(img.attr('data-src') || img.attr('data-original') || img.attr('src'));
      const genreMatch = absUrl.match(/\/id\/([^/]+)\/[^/]+\/list/);
      const genre = genreMatch && genreMatch[1] !== 'canvas' ? genreMatch[1] : null;
      items.push({ titleNo, title, thumbnail: thumb, genre, url: absUrl.split('&webtoon-platform-redirect')[0] });
    });

    const seen = new Set();
    return items.filter((it) => {
      if (seen.has(it.titleNo)) return false;
      seen.add(it.titleNo);
      return true;
    });
  }

  async episodeImages(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const images = [];
    $('#_imageList img').each((_, el) => {
      const src = realImageOrNull($(el).attr('data-url') || $(el).attr('src'));
      if (src) images.push(src);
    });
    const title = $('h1.subj_episode, .subj_info .subj, h1.subj, .info .subj').first().text().trim()
      || $('meta[property="og:title"]').attr('content') || null;
    const thumbnail = $('meta[property="og:image"]').attr('content') || null;
    return { images, title, thumbnail };
  }
}

module.exports = new WebtoonsScraper();
module.exports.WebtoonsScraper = WebtoonsScraper;
