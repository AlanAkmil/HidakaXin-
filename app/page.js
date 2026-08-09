import Link from 'next/link';
import AnimeCard from '../components/AnimeCard';
import AnimeRow from '../components/AnimeRow';
import JadwalCard from '../components/JadwalCard';
import MangaCard from '../components/MangaCard';
import NovelRow from '../components/NovelRow';
import SectionHeader from '../components/SectionHeader';
import ContinueWatching from '../components/ContinueWatching';
import ContinueReadingNovel from '../components/ContinueReadingNovel';
import ContinueReadingKomik from '../components/ContinueReadingKomik';
import MissionTrack from '../components/MissionTrack';
import scraper from '../lib/scraper';
import sanka from '../lib/sankaScraper';
import anichin from '../lib/anichinScraper';
import manga from '../lib/mangaScraper';
import webtoons from '../lib/webtoonsScraper';
import { getLatestMeioNovels } from '../lib/meioNovelScraper';
import { getDonghuaSource } from '../lib/donghuaSource';
import { normalizeDonghua, normalizeAnichin, normalizeSanka, normalizeWestmanhwa, normalizeWebtoon, deriveSeriesUrl, shuffleTogether, findScheduleKeyForDay, DAY_NAMES_ID } from '../lib/normalize';

export const revalidate = 300;

// Returns a common shape regardless of which donghua source is selected —
// { heroItem, weeklyRow, latest, popular, schedule } — so the rest of the
// page doesn't need to branch on source. AnimeXin has richer categories
// (weekly/all-time popular) than Anichin's API (which only really offers
// ongoing/completed/schedule), so Anichin's mapping is a best-effort
// approximation rather than a perfect match.
async function getDonghuaData(source) {
  if (source === 'anichin') {
    const [ongoingRes, completedRes, scheduleRes] = await Promise.all([
      anichin.home(1).catch(() => null),
      anichin.completed(1).catch(() => null),
      anichin.schedule().catch(() => null)
    ]);
    const ongoing = (ongoingRes?.items || []).map(normalizeAnichin);
    const completed = (completedRes?.items || []).map(normalizeAnichin);
    const schedule = {};
    for (const [day, items] of Object.entries(scheduleRes || {})) {
      schedule[day] = (items || []).map(normalizeAnichin);
    }
    return {
      ok: !!ongoingRes,
      heroItem: ongoing[0] || null,
      weeklyRow: ongoing.slice(1),
      latest: ongoing,
      popular: completed.length ? completed : ongoing,
      schedule
    };
  }

  const [homePayload, releasePayload] = await Promise.all([
    scraper.home(1).catch(() => null),
    scraper.release().catch(() => null)
  ]);
  const data = homePayload?.data;
  const schedule = {};
  for (const [day, items] of Object.entries(releasePayload?.data?.schedule || {})) {
    schedule[day] = (items || []).map(normalizeDonghua);
  }
  return {
    ok: !!data,
    heroItem: data?.popular?.weekly?.[0] ? normalizeDonghua(data.popular.weekly[0]) : null,
    weeklyRow: (data?.popular?.weekly || []).slice(1).map(normalizeDonghua),
    // latestReleases links point to the newest EPISODE post, not the
    // series page — derive the series slug so cards open the detail page
    // (with full episode list) instead of a bare single-episode post.
    latest: (data?.latestReleases || []).map((item) => normalizeDonghua({ ...item, url: deriveSeriesUrl(item.url) })),
    popular: (data?.popular?.allTime || []).map(normalizeDonghua),
    schedule
  };
}

async function getNovels() {
  return getLatestMeioNovels({ limit: 9 }).catch(() => []);
}

async function getData() {
  const source = getDonghuaSource();
  const [donghua, sankaHome, komikPayload, webtoonPayload, novels] = await Promise.all([
    getDonghuaData(source),
    sanka.home().catch(() => null),
    manga.home().catch(() => null),
    webtoons.trending('daily').catch(() => []),
    getNovels()
  ]);

  return {
    source,
    donghua,
    sankaOngoing: sankaHome?.ongoing?.animeList || [],
    sankaCompleted: sankaHome?.completed?.animeList || [],
    komik: shuffleTogether(
      (komikPayload?.items || []).map(normalizeWestmanhwa),
      (webtoonPayload || []).map(normalizeWebtoon)
    ),
    novels
  };
}

export default async function HomePage() {
  const { donghua, sankaOngoing, sankaCompleted, komik, novels } = await getData();

  const mergedLatest = shuffleTogether(donghua.latest, sankaOngoing.map(normalizeSanka));
  const mergedPopular = shuffleTogether(donghua.popular, sankaCompleted.map(normalizeSanka));
  const today = mergeTodaySchedule(donghua.schedule, null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <MissionTrack event="open_beranda" />
      {!donghua.ok && sankaOngoing.length === 0 && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat data dari sumber. Coba refresh beberapa saat lagi.
        </p>
      )}

      <ContinueWatching />
      <ContinueReadingNovel />
      <ContinueReadingKomik />

      {donghua.heroItem && (
        <section className="mb-8">
          <SectionHeader title="Sedang Hangat" href="/daftar?order=popular" />

          <Link href={hrefForItem(donghua.heroItem)} className="mb-3 block overflow-hidden rounded-2xl border border-line shadow-card">
            <div className="relative aspect-[16/9] bg-paper-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={donghua.heroItem.image} alt={donghua.heroItem.title} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-xs font-semibold text-accent-50">{donghua.heroItem.genres?.[0]}</p>
                <p className="line-clamp-1 text-lg font-extrabold text-white">{donghua.heroItem.title}</p>
              </div>
            </div>
          </Link>

          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {shuffleTogether(
              donghua.weeklyRow.slice(0, 8),
              sankaOngoing.slice(0, 8).map(normalizeSanka)
            ).map((item, i) => (
              <AnimeRow key={item.url + i} item={item} />
            ))}
          </div>
        </section>
      )}

      {mergedLatest.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Judul Baru" href="/daftar?order=latest" />
          <div className="grid grid-cols-3 gap-3">
            {mergedLatest.slice(0, 9).map((item, i) => (
              <AnimeCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {today?.list?.length > 0 && (
        <section className="mb-8">
          <SectionHeader title={`Jadwal ${today.day}`} href="/jadwal" />
          <div className="grid grid-cols-3 gap-3">
            {today.list.slice(0, 6).map((item, i) => (
              <JadwalCard key={item.url + i} item={item} />
            ))}
          </div>
        </section>
      )}

      {mergedPopular.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Paling Populer" href="/daftar?order=popular" />
          <div className="grid grid-cols-3 gap-3">
            {mergedPopular.slice(0, 9).map((item, i) => (
              <AnimeCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {komik?.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Komik" href="/komik" />
          <div className="grid grid-cols-3 gap-3">
            {komik.slice(0, 9).map((item, i) => (
              <MangaCard key={item.url + i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      <NovelRow items={novels} />
    </div>
  );
}

function hrefForItem(item) {
  if (item.source === 'sanka') return `/anime-sanka/${item.url}`;
  const slug = pathSlug(item.url);
  if (item.source === 'anichin') return `/anime-ac/${slug}`;
  return `/anime/${slug}`;
}

function pathSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return '';
  }
}

const DAY_KEYS = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

// Merges the active donghua source's schedule (AnimeXin uses English day
// labels; Anichin's day-key format is unconfirmed, handled defensively via
// findScheduleKeyForDay) with anime's ongoing() schedule (fixed Indonesian
// senin..minggu keys) into one list for today.
function mergeTodaySchedule(donghuaSchedule, animeSchedule) {
  const todayIdx = new Date().getDay();
  const dayName = DAY_NAMES_ID[todayIdx];

  const animeList = animeSchedule?.[DAY_KEYS[todayIdx]] || [];

  let donghuaList = [];
  if (donghuaSchedule) {
    const keys = Object.keys(donghuaSchedule);
    const match = findScheduleKeyForDay(keys, todayIdx);
    if (match) donghuaList = donghuaSchedule[match];
  }
  const list = shuffleTogether(donghuaList, animeList);
  return list.length ? { day: dayName, list } : null;
}
