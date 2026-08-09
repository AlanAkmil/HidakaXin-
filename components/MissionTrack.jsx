'use client';

import { useEffect } from 'react';
import { trackMissionProgress } from '../lib/store';

// Drop this into any server-rendered page to count "opened this page"
// toward today's mission progress, e.g. <MissionTrack event="open_jadwal" />
export default function MissionTrack({ event, amount = 1 }) {
  useEffect(() => {
    trackMissionProgress(event, amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
