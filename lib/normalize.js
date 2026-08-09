// Both sources describe roughly the same thing (title, poster, episode,
// status, rating) but with different field names. These normalizers give
// every card a common shape plus a `source` tag ('donghua' | 'anime') so
// components know which detail/watch route to link to.

// Shortens "Episode 82" -> "Eps 82" so it doesn't visually collide with the
// Anime/Donghua source badge on cards. Only touches that one pattern —
// other status text (Ongoing, Complete, etc.) passes through unchanged.
export function shortLabel(text) {
  if (!text) return text;
  return text.replace(/^Episode\s+/i, 'Eps ');
}

// Donghua's source (AnimeXin) labels schedule days in ENGLISH ("Wednesday"),
// while anime's source (Nimegami) uses Indonesian lowercase keys ("rabu").
// This maps both to a common Sun=0..Sat=6 index so they can be matched
// correctly regardless of which language either source happens to use.
export const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const DAY_ALIASES = {
  0: ['minggu', 'sunday'],
  1: ['senin', 'monday'],
  2: ['selasa', 'tuesday'],
  3: ['rabu', 'wednesday'],
  4: ['kamis', 'thursday'],
  5: ['jumat', "jum'at", 'friday'],
  6: ['sabtu', 'saturday']
};

export function findScheduleKeyForDay(keys, dayIndex) {
  const aliases = DAY_ALIASES[dayIndex] || [];
  return keys.find((k) => {
    const kLower = k.toLowerCase();
    return aliases.some((a) => kLower.includes(a));
  }) || null;
}

// Komik has two sources too — westmanhwa (scraped manhwa/manhua site) and
// webtoons (official Webtoons.com). Same idea as normalizeDonghua/
// normalizeAnime: give every card a common shape + a `source` tag so
// MangaCard knows which detail/reader route to link to.
export function normalizeWestmanhwa(item) {
  return { ...item, source: 'westmanhwa' };
}

export function normalizeWebtoon(item) {
  return {
    source: 'webtoons',
    title: item.title,
    url: item.url,
    image: item.thumbnail,
    chapter: null,
    rating: item.likes || null,
    views: null,
    type: item.genre || null
  };
}

export function normalizeAnichin(item) {
  return { ...item, source: 'anichin' };
}

export function normalizeDonghua(item) {
  return {
    source: 'donghua',
    title: item.title,
    url: item.url,
    image: item.image,
    type: item.type || null,
    status: item.status || null,
    sub: item.sub || null,
    rating: item.rating || null,
    genres: item.genres || [],
    episode: item.episode || null,
    time: item.time || null
  };
}

// "Judul Baru" data (latestReleases) is scraped from the source site's
// "latest updates" widget, whose links point straight to the newest EPISODE
// post (e.g. ".../gu-an-episode-3-indonesia-english-sub/"), not the series
// page (".../gu-an/"). Following that link into the detail page renders the
// single episode post's own template, which has no episode-list widget
// (that only exists on the series hub page) — so the detail page looks
// like it's "missing" the episode list. Strip the "-episode-N-..." suffix
// to recover the series slug so cards route to the real series page.
export function deriveSeriesUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    // Same convention as anichinScraper's getSeriesSlugFrom: normal episodes
    // end in "-episode-N-...", finales sometimes wedge in "-tamat-" too.
    const stripped = path.replace(/-episode-\d+(-tamat)?(-.*)?$/i, '');
    if (!stripped || stripped === path) return url;
    u.pathname = `${stripped}/`;
    return u.toString();
  } catch {
    return url;
  }
}

// Deterministic-enough shuffle for interleaving two source lists into one
// feed (server-rendered per request, so a fresh mix each time is fine).
export function shuffleTogether(...lists) {
  const merged = lists.flat();
  for (let i = merged.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [merged[i], merged[j]] = [merged[j], merged[i]];
  }
  return merged;
}

// Sanka Vollerei API wraps Otakudesu. Item shape differs by endpoint:
// home/ongoing/completed use `animeId` + absolute-ish fields; schedule()
// entries use `slug` + a relative `url` instead. Normalize both into the
// same card fields (using the bare id as `url`, not a real link) so
// AnimeCard/AnimeRow/JadwalCard can route it via `/anime-sanka/{id}`.
export function normalizeSanka(item) {
  const id = item.animeId || item.slug;
  return {
    source: 'sanka',
    title: item.title,
    url: id,
    image: item.poster,
    type: null,
    status: item.status || (item.score ? 'Completed' : (item.episodes != null ? 'Ongoing' : null)),
    sub: null,
    rating: item.score || null,
    genres: (item.genreList || []).map((g) => g.title),
    episode: item.episodes ? `Episode ${item.episodes}` : null,
    time: item.latestReleaseDate || item.lastReleaseDate || null
  };
}


