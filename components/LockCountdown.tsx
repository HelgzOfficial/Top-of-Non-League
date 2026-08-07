"use client";

import { useEffect, useState } from "react";

/**
 * Live "time remaining" countdown to a single deadline timestamp (ms
 * epoch). Used on the Home page to show how long until the NEXT fixture in
 * the open gameweek locks — see app/(app)/pick/PickBoard.tsx for the
 * equivalent per-fixture countdown shown on the Pick tab itself, where
 * every fixture locks independently 90 minutes before its own kickoff.
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
    <p className={`text-[12px] font-bold mt-1.5 ${urgent ? "text-red" : "text-brandGreen"}`}>
      Next pick locks in {label}
    </p>
  );
}
