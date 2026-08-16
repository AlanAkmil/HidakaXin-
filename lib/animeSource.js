import { cookies } from 'next/headers';

export const ANIME_SOURCE_COOKIE = 'hidakaxin_anime_source';
export const ANIME_SOURCES = [
  { value: 'otakudesu', label: 'Otakudesu' },
  { value: 'samehadaku', label: 'Samehadaku' }
];

export function getAnimeSource() {
  try {
    const val = cookies().get(ANIME_SOURCE_COOKIE)?.value;
    return val === 'samehadaku' ? 'samehadaku' : 'otakudesu';
  } catch {
    return 'otakudesu';
  }
}
