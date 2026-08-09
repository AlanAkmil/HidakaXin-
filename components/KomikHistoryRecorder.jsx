'use client';

import { useEffect } from 'react';
import { pushKomikHistory, trackMissionProgress, trackUniqueTitle } from '../lib/store';

export default function KomikHistoryRecorder({ item }) {
  useEffect(() => {
    if (item?.chapterUrl) {
      pushKomikHistory(item);
      trackMissionProgress('komik', 1);
      trackUniqueTitle(item.komikSlug || item.chapterUrl);
    }
  }, [item?.chapterUrl]);

  return null;
}
