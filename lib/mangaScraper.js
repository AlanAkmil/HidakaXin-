const axios = require('axios');
const cheerio = require('cheerio');

// ---------------------------------------------------------------------------
// Raw scraper for komiku.org, as provided. Kept as-is (methods renamed
// nowhere) so it's easy to diff against future updates from the source.
// ---------------------------------------------------------------------------
class KomikuScraper {
  constructor() {
    this.baseUrl = 'https://komiku.org';
    this.apiUrl = 'https://api.komiku.org';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Referer': this.baseUrl
    };
  }

  _getImage(el, $) {
    return $(el).attr('data-src') || $(el).attr('src') || '';
  }

  async getHome() {
    try {
      const { data } = await axios.get(this.baseUrl, { headers: this.headers });
      const $ = cheerio.load(data);
      const result = { ranking: { mingguan: [], harian: [], total: [] }, populer: [], terbaru: [] };

      const parseRanking = (selector) => {
        const list = [];
        $(selector).find('article.ls4').each((i, el) => {
          const meta = $(el).find('.ls4s').text().split('·');
          list.push({
            rank: $(el).find('.rank-num').text().trim(),
            title: $(el).find('h4 a').text().trim(),
            endpoint: $(el).find('h4 a').attr('href'),
            thumbnail: this._getImage($(el).find('img'), $),
            genre: meta[0] ? meta[0].trim() : '',
            views: meta[1] ? meta[1].trim() : '',
            latest_chapter: $(el).find('.ls24').text().trim(),
            chapter_endpoint: $(el).find('.ls24').attr('href')
          });
        });
        return list;
      };

      result.ranking.mingguan = parseRanking('#rank-mingguan');
      result.ranking.harian = parseRanking('#rank-harian');
      result.ranking.total = parseRanking('#rank-total');

      $('#ls12-populer article.ls2').each((i, el) => {
        const meta = $(el).find('.ls2t').text().split('·');
        result.populer.push({
          title: $(el).find('h3 a').text().trim(),
          endpoint: $(el).find('h3 a').attr('href'),
          thumbnail: this._getImage($(el).find('img'), $),
          type: $(el).attr('data-tipe') || 'Unknown',
          genre: meta[0] ? meta[0].trim() : '',
          views: meta[1] ? meta[1].trim() : '',
          latest_chapter: $(el).find('.ls2l').text().trim(),
          chapter_endpoint: $(el).find('.ls2l').attr('href')
        });
      });

      $('.ls2-wrap article.ls2').each((i, el) => {
        const meta = $(el).find('.ls2t').text().split('·');
        result.terbaru.push({
          title: $(el).find('h3 a').text().trim(),
          endpoint: $(el).find('h3 a').attr('href'),
          thumbnail: this._getImage($(el).find('img'), $),
          genre: meta[0] ? meta[0].trim() : '',
          waktu_update: meta[1] ? meta[1].trim() : '',
          latest_chapter: $(el).find('.ls2l').text().trim(),
          chapter_endpoint: $(el).find('.ls2l').attr('href')
        });
      });

      return result;
    } catch (error) {
      console.error('Error fetching Home:', error.message);
      return null;
    }
  }

  async getKomikList(type = '', orderBy = 'modified', page = 1) {
    try {
      let url = `${this.apiUrl}/manga/?tipe=${type}&orderby=${orderBy}`;
      if (page > 1) url += `&page=${page}`;

      const { data } = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(data);
      const list = [];

      $('div.bge').each((i, el) => {
        list.push({
          title: $(el).find('h3').text().trim(),
          endpoint: $(el).find('a').attr('href'),
          thumbnail: this._getImage($(el).find('img'), $),
          chapter_terbaru: $(el).find('.kan .new1').first().text().trim(),
          deskripsi: $(el).find('.deskripsi, .desc, p').text().trim() || 'Tidak ada deskripsi'
        });
      });

      return list;
    } catch (error) {
      console.error('Error fetching Komik List:', error.message);
      return [];
    }
  }

  async searchKomik(query) {
    try {
      const url = `${this.apiUrl}/?post_type=manga&s=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(data);
      const list = [];

      $('div.bge, article.ls4, article.ls2').each((i, el) => {
        const title = $(el).find('h3, h4').text().trim();
        if (!title) return;

        list.push({
          title,
          endpoint: $(el).find('a').first().attr('href'),
          thumbnail: this._getImage($(el).find('img'), $),
          jenis: $(el).find('.tpe1_inf b, .ls4s').text().trim(),
          chapter_terbaru: $(el).find('.new1, .ls24, .ls2l').first().text().trim()
        });
      });

      return list;
    } catch (error) {
      console.error('Error fetching Search:', error.message);
      return [];
    }
  }

  async getDetailKomik(endpoint) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      const { data } = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(data);

      const chapters = [];
      $('#Daftar_Chapter tr, #chapter_list li, .lchx').each((i, el) => {
        const chapterLink = $(el).find('a').first();
        if (chapterLink.length > 0 && chapterLink.attr('href')) {
          let ep = chapterLink.attr('href');
          if (!ep.startsWith('http')) {
            ep = ep.startsWith('/') ? `${this.baseUrl}${ep}` : `${this.baseUrl}/${ep}`;
          }
          const dateText = $(el).find('.tanggals, .tgl, .dt, .date').text().trim();
          chapters.push({ chapter: chapterLink.text().trim(), endpoint: ep, date: dateText });
        }
      });

      const metadata = {};
      $('.inftable tr').each((i, el) => {
        let key = $(el).find('td').first().text().replace(/:/g, '').trim().toLowerCase();
        let value = $(el).find('td').last().text().trim();
        if (key) metadata[key] = value;
      });

      return {
        title: $('meta[property="og:title"]').attr('content')?.replace(/^Komik\s+/i, '').trim()
          || $('table.inftable tr').filter((i, el) => $(el).find('td').first().text().trim() === 'Judul:').find('td').last().text().trim()
          || $('h1').first().text().trim()
          || null,
        alt_title: metadata['judul alternatif'] || metadata['sinonim'] || '',
        thumbnail: $('meta[property="og:image"]').attr('content') || this._getImage($('.ims img, article img').first(), $) || null,
        description: $('p.desc, #Sinopsis, .desc').first().text().trim() || null,
        metadata,
        genres: $('.genre li a').map((i, el) => $(el).text().trim()).get(),
        chapters
      };
    } catch (error) {
      console.error('Error fetching Detail:', error.message);
      return null;
    }
  }

  async getChapterImages(endpoint) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      const { data } = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(data);
      const images = [];

      $('#Baca_Komik img, .main-reading-area img').each((i, el) => {
        let imgUrl = this._getImage(el, $);
        if (imgUrl) images.push(imgUrl);
      });

      return images;
    } catch (error) {
      console.error('Error fetching Chapter Images:', error.message);
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Adapter: exposes the same interface the rest of HidakaXin already calls
// (home/search/detail/read + slug helpers), backed by KomikuScraper above.
// Every "slug" used in URLs is the full source URL, percent-encoded — this
// avoids needing to reverse-engineer komiku.org's exact slug format, and
// matches how HidakaXin already handles Webtoons/Sanka sources.
// ---------------------------------------------------------------------------
const komiku = new KomikuScraper();

function toSlug(url) {
  return url ? encodeURIComponent(url) : null;
}
function fromSlug(slug) {
  return decodeURIComponent(slug);
}
function absUrl(href) {
  if (!href) return null;
  return href.startsWith('http') ? href : `https://komiku.org${href.startsWith('/') ? '' : '/'}${href}`;
}

// komiku.org labels origin as free text ("Manhwa", "Manhwa (Korea)", "Manga
// (Japan)", etc, depending on the exact metadata row) — normalize down to
// one of the three real categories instead of trusting the raw string.
function normalizeKomikType(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.includes('manhwa')) return 'Manhwa';
  if (s.includes('manhua')) return 'Manhua';
  if (s.includes('manga')) return 'Manga';
  return null;
}

function mapListItem(raw) {
  const url = absUrl(raw.endpoint);
  return {
    title: raw.title || null,
    slug: toSlug(url),
    url,
    image: raw.thumbnail || null,
    chapter: raw.latest_chapter || raw.chapter_terbaru || null,
    rating: null,
    views: raw.views || null,
    type: normalizeKomikType(raw.type || raw.genre)
  };
}

class MangaScraper {
  async home(page = 1) {
    const rawList = await komiku.getKomikList('', 'modified', page);
    const items = rawList.map(mapListItem);
    return { url: `${komiku.apiUrl}/manga/?page=${page}`, count: items.length, items, next: items.length > 0 };
  }

  // Unlike home() above, this filters by origin via komiku's own `?tipe=`
  // query param — so every item that comes back is GUARANTEED to be that
  // type, letting the UI show an accurate Manga/Manhwa/Manhua tag instead
  // of guessing from scraped attributes that mostly aren't present on the
  // listing page itself.
  async list(type, page = 1) {
    const rawList = await komiku.getKomikList(type, 'modified', page);
    const label = normalizeKomikType(type) || null;
    const items = rawList.map(mapListItem).map((item) => ({ ...item, type: label || item.type }));
    return { url: `${komiku.apiUrl}/manga/?tipe=${type}&page=${page}`, count: items.length, items, next: items.length > 0 };
  }

  async search(query, page = 1) {
    // Komiku's search endpoint doesn't take a page param; only page 1 is available.
    const rawList = page === 1 ? await komiku.searchKomik(query) : [];
    const items = rawList.map(mapListItem);
    return { url: `${komiku.apiUrl}/?post_type=manga&s=${encodeURIComponent(query)}`, count: items.length, items, next: false };
  }

  async detail(slug) {
    const url = fromSlug(slug);
    const d = await komiku.getDetailKomik(url);
    if (!d || !d.title) return null;

    const chapters = (d.chapters || [])
      .map((c) => ({ label: c.chapter, url: c.endpoint, slug: toSlug(c.endpoint), date: c.date }))
      .sort((a, b) => {
        const na = parseFloat((a.label.match(/[\d.]+/) || ['0'])[0]);
        const nb = parseFloat((b.label.match(/[\d.]+/) || ['0'])[0]);
        return na - nb;
      });

    const typeRaw = d.metadata?.['jenis komik'] || d.metadata?.jenis || d.metadata?.tipe || d.metadata?.type || null;

    return {
      slug: toSlug(url),
      url,
      title: d.title,
      cover: d.thumbnail || null,
      synopsis: d.description || null,
      genres: d.genres || [],
      status: d.metadata?.status || null,
      type: normalizeKomikType(typeRaw),
      rating: null,
      chapters
    };
  }

  async read(chapterSlugOrUrl) {
    const url = fromSlug(chapterSlugOrUrl);
    const images = await komiku.getChapterImages(url);
    return { url, images, prevUrl: null, nextUrl: null };
  }
}

module.exports = new MangaScraper();
module.exports.MangaScraper = MangaScraper;
module.exports.KomikuScraper = KomikuScraper;
module.exports.slugFromChapterUrl = toSlug;
module.exports.slugFromKomikUrl = toSlug;
