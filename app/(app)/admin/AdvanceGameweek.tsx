"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forceCloseGameweek, reopenGameweek } from "./actions";
import type { FixtureWithTeamsAndResult } from "@/lib/types";

type Props = {
  gameweekId: string;
  gameweekNumber: number;
  fixtures: FixtureWithTeamsAndResult[];
  forceClosedGameweeks: { gameweek_id: string; number: number }[];
};

export default function AdvanceGameweek({
  gameweekId,
  gameweekNumber,
  fixtures,
  forceClosedGameweeks,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const unplayed = fixtures.filter((f) => !f.result);

  async function handleForceClose() {
    setBusy(gameweekId);
    setError(null);
    const res = await forceCloseGameweek(gameweekId);
    setBusy(null);
    setConfirming(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleReopen(id: string) {
    setBusy(id);
    setError(null);
    const res = await reopenGameweek(id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (unplayed.length === 0 && forceClosedGameweeks.length === 0) {
    return null;
  }

  return (
    <div className="card !p-4 mb-6">
      <span className="font-extrabold text-[15px]">Gameweeks</span>

      {unplayed.length > 0 && (
        <div className="mt-2">
          <p className="text-[12px] text-sub">
            Gameweek {gameweekNumber} is current, but {unplayed.length} fixture
            {unplayed.length === 1 ? "" : "s"} still {unplayed.length === 1 ? "has" : "have"} no result:
            </p>
          <ul className="text-[12.5px] text-ink mt-1.5 mb-2.5 list-disc list-inside">
            {unplayed.map((f) => (
              <li key={f.id}>
                {f.home_team.name} vs {f.away_team.name}
              </li>
            ))}
          </ul>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="py-2.5 px-4 rounded-xl font-extrabold text-[13px] border border-lineHi text-ink"
            >
              Move on to Gameweek {gameweekNumber + 1}
            </button>
          ) : (
            <div className="rounded-smcard border border-lineHi p-3">
              <p className="text-[12px] text-sub mb-2.5">
                Only do this if {unplayed.length === 1 ? "that fixture is" : "those fixtures are"} never
                going to get a real result (postponed for good, abandoned, etc). Anyone who picked a team
                still waiting on a result here won&apos;t score for this gameweek — and you can undo this
                below if needed.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleForceClose}
                  disabled={busy === gameweekId}
                  className="btn-primary py-2.5 px-4 rounded-xl font-extrabold text-[13px]"
                >
                  {busy === gameweekId ? "Moving on…" : "Yes, move on"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="py-2.5 px-4 rounded-xl font-extrabold text-[13px] text-subDim"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {forceClosedGameweeks.length > 0 && (
        <div className={unplayed.length > 0 ? "mt-4 pt-3 border-t border-line" : "mt-2"}>
          <p className="text-[12px] text-sub mb-1.5">Manually moved past:</p>
          {forceClosedGameweeks.map((gw) => (
            <div key={gw.gameweek_id} className="flex items-center justify-between py-1.5 text-[13px]">
              <span>Gameweek {gw.number}</span>
              <button
                onClick={() => handleReopen(gw.gameweek_id)}
                disabled={busy === gw.gameweek_id}
                className="text-[12px] font-bold text-subDim underline"
              >
                {busy === gw.gameweek_id ? "Reopening…" : "Reopen"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
