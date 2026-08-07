"use client";

import { useEffect, useState } from "react";

/**
 * A warning banner with a live countdown to the next fixture lock — shown
 * on the Home page whenever a manager hasn't picked yet for the open
 * gameweek, so the amount of time left to act is impossible to miss. See
 * app/(app)/pick/PickBoard.tsx for the equivalent per-fixture countdown on
 * the Pick tab itself, where every fixture locks independently 90 minutes
 * before its own kickoff.
 */
export default function LockCountdown({ lockAt }: { lockAt: number | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (lockAt === null || now === null) return null;

  const msLeft = lockAt - now;
  if (msLeft <= 0) return null;

  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const urgent = msLeft < 15 * 60 * 1000;

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mt-2.5 ${
        urgent ? "border-red/30 bg-red/10" : "border-gold/30 bg-gold/10"
      }`}
    >
      <span className={`text-[11.5px] font-bold ${urgent ? "text-red" : "text-gold"}`}>
        Time left to pick
      </span>
      <span className={`text-[14px] font-black tabular-nums ${urgent ? "text-red" : "text-gold"}`}>
        {label}
      </span>
    </div>
  );
}
