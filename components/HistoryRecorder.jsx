'use client';

import { useEffect } from 'react';
import { pushHistory, trackMissionProgress, trackUniqueTitle } from '../lib/store';

export default function HistoryRecorder({ item }) {
  useEffect(() => {
    if (item?.url) {
      pushHistory(item);
      trackMissionProgress('watch', 1);
      trackUniqueTitle(item.url);
    }
  }, [item?.url]);

  return null;
}
