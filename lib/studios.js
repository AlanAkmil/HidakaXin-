// AnimeXin (the source we scrape) doesn't expose a browsable index/archive
// of all studios, but individual studio pages DO exist and work at a
// confirmed URL pattern: https://animexin.dev/network/{slug}/
// (confirmed via a real scraped "Studio" link on an anime detail page —
// e.g. /network/tencent-penguin-pictures/ returns that studio's titles).
// So instead of guessing an index page or falling back to unreliable text
// search, we build direct links to that confirmed pattern.
const BASE = 'https://animexin.dev';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const NAMES = [
  'Tencent Penguin Pictures',
  'Haoliners Animation',
  'B.CMAY Pictures',
  'Foch Animation',
  'Colored Pencil Animation',
  'Nice Boat Animation',
  'Original Force',
  'Samsara Animation Studio',
  'Wan Wei Mobile',
  'Motion Magic',
  'Alpha Group',
  'iQIYI Pictures',
  'Youku Animation'
];

export const STUDIOS = NAMES.map((name) => ({
  name,
  url: `${BASE}/network/${slugify(name)}/`
}));
