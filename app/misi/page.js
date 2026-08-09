'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getCoins,
  getCheckinState,
  claimCheckin,
  getDailyMissions,
  getAllMissionProgress,
  claimMission
} from '../../lib/store';

const CHECKIN_REWARDS = [50, 75, 100, 125, 150, 200, 300];

export default function MisiPage() {
  const [coins, setCoins] = useState(0);
  const [checkin, setCheckin] = useState({ streak: 0, canClaim: false });
  const [missions, setMissions] = useState([]);
  const [progress, setProgress] = useState({});
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const [c, ci, daily] = await Promise.all([getCoins(), getCheckinState(), getDailyMissions()]);
    setCoins(c);
    setCheckin(ci);
    setMissions(daily);
    setProgress(await getAllMissionProgress(daily.map((m) => m.id)));
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    window.addEventListener('hidakaxin:storage', refresh);
    return () => window.removeEventListener('hidakaxin:storage', refresh);
  }, []);

  async function handleCheckin() {
    const res = await claimCheckin();
    if (!res.ok) {
      alert(res.error);
      return;
    }
    refresh();
  }

  async function handleClaim(id) {
    const res = await claimMission(id);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Misi & Koin</h1>
          <p className="text-sm text-ink-soft">Selesaiin misi harian buat dapetin koin, tukar banner keren.</p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-line bg-paper-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-xs text-ink-faint">Koin kamu</p>
            <p className="font-display text-xl font-extrabold text-ink">{loaded ? coins : '...'}</p>
          </div>
        </div>
        <Link href="/misi/banner" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">
          Toko Banner →
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-paper-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold text-ink">Check-in Harian</p>
          <p className="text-xs text-ink-faint">Streak: Hari {checkin.streak}</p>
        </div>
        <div className="mb-3 grid grid-cols-7 gap-1.5">
          {CHECKIN_REWARDS.map((r, i) => {
            const day = i + 1;
            const claimed = day <= checkin.streak && !checkin.canClaim;
            const isToday = checkin.canClaim && day === (checkin.streak % 7) + 1;
            return (
              <div
                key={day}
                className={`rounded-lg border p-1.5 text-center text-[10px] ${
                  claimed ? 'border-accent bg-accent-50 text-accent' : isToday ? 'border-accent text-ink' : 'border-line text-ink-faint'
                }`}
              >
                <div>H{day}</div>
                <div className="font-bold">⚡{r}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleCheckin}
          disabled={!checkin.canClaim}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-white disabled:bg-paper-soft disabled:text-ink-faint"
        >
          {checkin.canClaim ? `Check-in Sekarang (+${CHECKIN_REWARDS[checkin.streak % 7]} koin)` : '✅ Sudah Check-in Hari Ini'}
        </button>
      </div>

      <div>
        <p className="mb-3 font-display text-lg font-extrabold text-ink">Misi Hari Ini</p>
        <div className="space-y-2.5">
          {missions.map((m) => {
            const p = progress[m.id] || { progress: 0, claimed: false };
            const done = p.progress >= m.target;
            const pct = Math.min(100, Math.floor((p.progress / m.target) * 100));
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-paper-card p-3 shadow-card">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg ${p.claimed ? 'bg-accent-50' : 'bg-paper-soft'}`}>
                  {m.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{m.title}</p>
                  <p className="text-xs text-ink-faint">Reward: +{m.reward} koin</p>
                  {!p.claimed && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-soft">
                      <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleClaim(m.id)}
                  disabled={p.claimed || !done}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    p.claimed ? 'bg-paper-soft text-ink-faint' : done ? 'bg-accent text-white' : 'bg-paper-soft text-ink-faint'
                  }`}
                >
                  {p.claimed ? '✅ Selesai' : done ? 'Klaim' : `${Math.floor(p.progress)}/${m.target}`}
                </button>
              </div>
            );
          })}
          {loaded && missions.length === 0 && <p className="text-sm text-ink-faint">Belum ada misi buat hari ini.</p>}
        </div>
      </div>
    </div>
  );
}
