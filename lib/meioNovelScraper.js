import axios from 'axios';
import * as cheerio from 'cheerio';

const MEIO_BASE = 'https://meionovels.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
// Prefix so /novel/[slug] and /novel/baca/[slug]/[...chapter] can tell a
// MeioNovel slug apart from a WattPad slug (which always starts with the
// numeric story id, e.g. "123456789-judul") without changing the route
// shape or touching the WattPad code path at all.
export const MEIO_PREFIX = 'meio-';

function get(url) {
  return axios.get(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, timeout: 12000 }).then((r) => r.data);
}

// Madara's own frontend JS calls this endpoint to lazy-load the full chapter
// list for novels too long to render server-side. Untested against this
// specific site (no way to fire a POST from the dev sandbox this was built
// in) — verify via /api/novel/meio-debug before trusting it in the UI.
function postAjax(url) {
  return axios
    .post(url, null, {
      headers: {
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url
      },
      timeout: 12000
    })
    .then((r) => r.data);
}

function absUrl(href) {
  if (!href) return '';
  return href.startsWith('http') ? href : `${MEIO_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

// MeioNovel/novel/{slug}/ URLs — slug is always the 2nd path segment.
function slugFromMeioUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const i = parts.indexOf('novel');
    return i >= 0 ? parts[i + 1] : parts[0];
  } catch {
    return '';
  }
}

function statusFromText(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('tamat') || t.includes('completed')) return 'Completed';
  return 'Ongoing';
}

function parseChapterAnchors($) {
  const chapters = [];
  $('.wp-manga-chapter a, li.wp-manga-chapter a').each((i, el) => {
    const $a = $(el);
    const chapterUrl = absUrl($a.attr('href'));
    const chapterTitle = $a.text().trim();
    if (!chapterUrl || !chapterTitle) return;
    const chapterPath = new URL(chapterUrl).pathname
      .split('/')
      .filter(Boolean)
      .slice(2) // drop "novel" and the story slug — keep only chapter-specific segments
      .join('/');
    chapters.push({ title: chapterTitle, url: chapterUrl, chapterPath });
  });
  chapters.reverse(); // Madara lists newest-first; flip to reading order
  return chapters;
}

// Madara theme renders both search results and archive/listing pages using
// the same card markup, just under different wrapper selectors depending on
// the page type — trying all of them keeps this working across pages
// without needing per-page-type code.
const CARD_SELECTOR =
  '.c-tabs-item__content, .page-item-detail, .manga .item, .row.c-tabs-item, div.page-listing-item .page-item-detail';

function parseCards($) {
  const items = [];
  const seen = new Set();

  $(CARD_SELECTOR).each((i, el) => {
    const $el = $(el);
    const linkEl = $el.find('.post-title a, .h5 a, h3 a, h4 a, h5 a').first();
    const title = linkEl.text().trim();
    const href = linkEl.attr('href');
    if (!title || !href) return;

    const url = absUrl(href);
    const slug = slugFromMeioUrl(url);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const img = $el.find('img').first();
    const cover = img.attr('data-src') || img.attr('src') || '';
    const statusText = $el.find('.mg_status, .status, .summary-content').first().text();
    const chapterText = $el.find('.chapter-item a, .list-chapter a').first().text().trim();

    items.push({
      id: slug,
      title,
      cover: cover.trim(),
      status: statusFromText(statusText),
      url,
      slug: MEIO_PREFIX + slug,
      latestChapterLabel: chapterText,
      source: 'meionovel'
    });
  });

  return items;
}

export async function searchMeioNovels(query, { limit = 20 } = {}) {
  if (!query) return [];
  try {
    const html = await get(`${MEIO_BASE}/?s=${encodeURIComponent(query)}&post_type=wp-manga`);
    return parseCards(cheerio.load(html)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLatestMeioNovels({ limit = 20, page = 1 } = {}) {
  try {
    const url = page > 1 ? `${MEIO_BASE}/novel/page/${page}/` : `${MEIO_BASE}/novel/`;
    const html = await get(url);
    return parseCards(cheerio.load(html)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getPopularMeioNovels({ limit = 20 } = {}) {
  try {
    const html = await get(`${MEIO_BASE}/novel/?m_orderby=views`);
    return parseCards(cheerio.load(html)).slice(0, limit);
  } catch {
    return [];
  }
}

// slugOrUrl accepts either a bare "jadi-ibu-kos-di-dunia-game" slug (with or
// without the MEIO_PREFIX) or a full meionovels.com URL.
export async function getMeioNovelDetail(slugOrUrl) {
  const slug = slugOrUrl.startsWith('http')
    ? slugFromMeioUrl(slugOrUrl)
    : slugOrUrl.replace(new RegExp(`^${MEIO_PREFIX}`), '');
  const url = `${MEIO_BASE}/novel/${slug}/`;

  const html = await get(url);
  const $ = cheerio.load(html);

  const title = $('.post-title h1, h1.entry-title').first().text().trim();
  const coverImg = $('.summary_image img, .tab-thumb img').first();
  const coverRaw = coverImg.attr('data-src') || coverImg.attr('data-lazy-src') || coverImg.attr('src') || '';
  const cover = absUrl(coverRaw.trim());
  const description = $('.summary__content, .description-summary .summary__content, .manga-excerpt')
    .first()
    .text()
    .trim();
  const author = $('.author-content a, .manga-authors a').first().text().trim() || 'Unknown';
  const statusText = $('.post-status .summary-content, .manga-status .summary-content').first().text();
  const genres = $('.genres-content a, .manga-genres a')
    .map((i, el) => $(el).text().trim())
    .get();

  let chapters = parseChapterAnchors($);

  // Novels with a lot of chapters don't render the full list in the initial
  // HTML — Madara lazy-loads it via an AJAX POST after the page loads, which
  // a plain GET fetch never triggers. Try firing that same AJAX call
  // ourselves first (untested against this specific install — verify via
  // /api/novel/meio-debug); only fall back to the single "Read First" link
  // below if the endpoint doesn't exist here or returns nothing.
  if (chapters.length === 0) {
    try {
      const ajaxHtml = await postAjax(`${url}ajax/chapters/`);
      if (ajaxHtml) chapters = parseChapterAnchors(cheerio.load(ajaxHtml));
    } catch {
      // endpoint not available on this install — fall through to Read First
    }
  }

  // Still nothing? Only "Read First" / "Read Last" survive as real links in
  // the initial HTML for these long novels. Fall back to those so there's
  // at least a starting point — the reader page's own prev/next chapter
  // links (scraped from the reading page itself) carry the reader forward.
  let chapterCountLabel = null;
  if (chapters.length === 0) {
    const firstHref = $('a:contains("Read First"), a.btn-read, a.first-chapter').first().attr('href');
    const lastHref = $('a:contains("Read Last"), a.last-chapter').first().attr('href');

    const makeEntry = (href, title) => {
      const chapterUrl = absUrl(href);
      if (!chapterUrl) return null;
      const chapterPath = new URL(chapterUrl).pathname.split('/').filter(Boolean).slice(2).join('/');
      return { title, url: chapterUrl, chapterPath };
    };

    const first = firstHref ? makeEntry(firstHref, 'Chapter Pertama') : null;
    if (first) chapters.push(first);

    // "Chapters" info row on the detail page (e.g. "Chapters: 2016") — used
    // only to show an accurate count badge, not to build a full jump list.
    $('.post-content_item, .summary-heading').each((i, el) => {
      const label = $(el).text().trim().toLowerCase();
      if (label.includes('chapter')) {
        const value = $(el).next('.summary-content, .post-content_item').text().trim();
        const n = parseInt(value.replace(/[^\d]/g, ''), 10);
        if (n) chapterCountLabel = n;
      }
    });
  }

  return {
    id: MEIO_PREFIX + slug,
    title: title || slug,
    author,
    cover,
    description,
    status: statusFromText(statusText),
    url,
    slug: MEIO_PREFIX + slug,
    genres,
    chapters: chapters.map((c, i) => ({ ...c, number: i + 1 })),
    chapterCount: chapterCountLabel || chapters.length,
    partialChapterList: chapters.length <= 1 && !!chapterCountLabel,
    source: 'meionovel'
  };
}

// chapterPath is whatever came out of getMeioNovelDetail()'s chapters[].chapterPath
// — e.g. "chapter-1035" or "mtl/chapter-721" or "volume-4/chapter-6" — joined
// back onto the story slug to rebuild the real URL.
export async function scrapeMeioChapter(slug, chapterPath) {
  const realSlug = slug.replace(new RegExp(`^${MEIO_PREFIX}`), '');
  const url = `${MEIO_BASE}/novel/${realSlug}/${chapterPath}/`;

  const html = await get(url);
  const $ = cheerio.load(html);

  const title = $('#chapter-heading, .cha-tit, h1').first().text().trim() || chapterPath;
  const paragraphs = [];
  $('.reading-content p, .text-left p, .cha-content p').each((i, el) => {
    const t = $(el).text().trim();
    if (t) paragraphs.push(t);
  });

  const prevHref = $('.nav-previous a, a.btn-prev').first().attr('href');
  const nextHref = $('.nav-next a, a.btn-next').first().attr('href');

  return {
    title,
    content: paragraphs.join('\n\n'),
    prevUrl: prevHref ? absUrl(prevHref) : null,
    nextUrl: nextHref ? absUrl(nextHref) : null
  };
}

// Converts a full chapter URL (from prevUrl/nextUrl above, or a story URL)
// back into { slug, chapterPath } for building /novel/baca/[slug]/[...chapter] links.
export function meioChapterPathFromUrl(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const i = parts.indexOf('novel');
  if (i < 0) return null;
  const slug = parts[i + 1];
  const chapterPath = parts.slice(i + 2).join('/');
  return { slug: MEIO_PREFIX + slug, chapterPath };
}
