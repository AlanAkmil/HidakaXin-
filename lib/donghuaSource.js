import { cookies } from 'next/headers';

export const DONGHUA_SOURCE_COOKIE = 'hidakaxin_donghua_source';
export const DONGHUA_SOURCES = [
  { value: 'animexin', label: 'AnimeXin' },
  { value: 'anichin', label: 'Anichin' }
];

export function getDonghuaSource() {
  try {
    const val = cookies().get(DONGHUA_SOURCE_COOKIE)?.value;
    return val === 'anichin' ? 'anichin' : 'animexin';
  } catch {
    return 'animexin';
  }
}
