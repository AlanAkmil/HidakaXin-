import Link from 'next/link';
import JadwalCard from '../../components/JadwalCard';
import MissionTrack from '../../components/MissionTrack';
import scraper from '../../lib/scraper';
import sanka from '../../lib/sankaScraper';
import anichin from '../../lib/anichinScraper';
import { getDonghuaSource } from '../../lib/donghuaSource';
import { normalizeDonghua, normalizeAnichin, normalizeSanka, shuffleTogether, findScheduleKeyForDay, DAY_NAMES_ID } from '../../lib/normalize';

export const revalidate = 600;

const DAY_SHORT = { Minggu: 'MIN', Senin: 'SEN', Selasa: 'SEL', Rabu: 'RAB', Kamis: 'KAM', Jumat: 'JUM', Sabtu: 'SAB' };

async function getSchedules() {
  const source = getDonghuaSource();
  const [donghuaPayload, animePayload] = await Promise.all([
    source === 'anichin' ? anichin.schedule().catch(() => null) : scraper.release().then((r) => r?.data?.schedule).catch(() => null),
    sanka.schedule().catch(() => null)
  ]);

  const donghuaRaw = donghuaPayload || {};
  const normalizer = source === 'anichin' ? normalizeAnichin : normalizeDonghua;
  const donghua = {};
  for (const [day, items] of Object.entries(donghuaRaw)) {
    donghua[day] = (items || []).map(normalizer);
  }

  // Sanka's schedule() returns [{ day: 'Senin', anime_list: [...] }, ...] —
  // day names already match DAY_NAMES_ID, so key directly off them.
  const anime = {};
  for (const entry of (animePayload || [])) {
    anime[entry.day] = (entry.anime_list || []).map(normalizeSanka);
  }

  return { donghua, anime, source };
}

export default async function JadwalPage({ searchParams }) {
  const { donghua, anime } = await getSchedules();

  const todayIndex = new Date().getDay();
  const activeDay = searchParams?.hari || DAY_NAMES_ID[todayIndex];
  const activeIdx = DAY_NAMES_ID.indexOf(activeDay);
  const dayIdx = activeIdx >= 0 ? activeIdx : todayIndex;

  const animeList = anime[activeDay] || [];

  const donghuaKeys = Object.keys(donghua);
  const donghuaMatch = findScheduleKeyForDay(donghuaKeys, dayIdx);
  const donghuaList = donghuaMatch ? donghua[donghuaMatch] : [];

  const list = shuffleTogether(donghuaList, animeList);
  const hasAnySchedule = Object.keys(anime).length > 0 || donghuaKeys.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <MissionTrack event="open_jadwal" />
      <div className="mb-5 flex border-b border-line pb-2">
        {DAY_NAMES_ID.map((day) => {
          const active = day === activeDay;
          return (
            <Link
              key={day}
              href={`/jadwal?hari=${encodeURIComponent(day)}`}
              className={`relative flex-1 pb-2 text-center text-sm font-bold tracking-wide ${active ? 'text-accent' : 'text-ink-faint'}`}
            >
              {DAY_SHORT[day]}
              {active && <span className="absolute -bottom-[9px] left-0 right-0 h-0.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </div>

      {!hasAnySchedule && (
        <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
          Gagal memuat jadwal rilis.
        </p>
      )}

      {list.length > 0 && (
        <div className="hide-scrollbar mb-5 flex gap-2.5 overflow-x-auto pb-1">
          {list.slice(0, 12).map((item, i) => (
            <Link key={item.url + i} href={hrefForScheduleItem(item)} className="flex-shrink-0">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-14 w-14 rounded-xl border border-line object-cover shadow-card"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-paper-soft text-ink-faint">?</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {list.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {list.map((item, i) => (
            <JadwalCard key={item.url + i} item={item} />
          ))}
        </div>
      ) : (
        hasAnySchedule && (
          <p className="rounded-xl border border-line bg-paper-card p-6 text-center text-ink-soft shadow-card">
            Tidak ada jadwal untuk hari ini.
          </p>
        )
      )}
    </div>
  );
}

function slugFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return url.replace(/^\/|\/$/g, '');
  }
}

function hrefForScheduleItem(item) {
  const slug = slugFromUrl(item.url);
  if (item.source === 'anichin') return `/anime-ac/${slug}`;
  if (item.source === 'sanka') return `/anime-sanka/${slug}`;
  return `/anime/${slug}`;
}
