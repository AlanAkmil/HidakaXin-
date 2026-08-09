'use client';

import { useEffect } from 'react';
import { pushNovelHistory, trackMissionProgress, trackUniqueTitle } from '../lib/store';

export default function NovelHistoryRecorder({ item }) {
  useEffect(() => {
    if (item?.chapterUrl) {
      pushNovelHistory(item);
      trackMissionProgress('novel', 1);
      trackUniqueTitle(item.novelSlug || item.chapterUrl);
    }
  }, [item?.chapterUrl]);

  return null;
}
