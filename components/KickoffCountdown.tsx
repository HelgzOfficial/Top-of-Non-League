"use client";

import { useEffect, useState } from "react";

/**
 * Live "time to kickoff" for a single fixture — distinct from
 * LockCountdown (time left to PICK) and the per-fixture lock countdown on
 * the Pick tab (time left before that fixture can no longer be picked).
 * This one just says when the match itself starts, once it hasn't yet.
 */
export default function KickoffCountdown({ kickoffAt }: { kickoffAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!kickoffAt) {
    return <span className="text-[10.5px] text-subDim font-bold">TBC</span>;
  }

  if (now === null) return null;

  const msLeft = new Date(kickoffAt).getTime() - now;

  if (msLeft <= 0) {
    return (
      <span className="text-[10px] font-extrabold px-2 py-1 rounded-full text-red bg-red/15">
        Kicked off
      </span>
    );
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return <span className="text-[11.5px] font-bold text-sub whitespace-nowrap">{label}</span>;
}
