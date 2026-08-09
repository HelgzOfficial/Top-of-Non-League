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

// How long past kickoff a fixture can go without a result before it counts
// as "stuck" rather than just "hasn't finished/been entered yet" — a normal
// non-league match plus stoppage time and a bit of admin lag fits well
// inside this. Fixtures that simply haven't kicked off yet (the far more
// common case for the current gameweek) never count as stuck, no matter
// how many of them there are — that was the bug: treating "not played yet"
// the same as "stuck" force-closed a gameweek that had barely started.
const STUCK_AFTER_MS = 4 * 60 * 60 * 1000;

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

  const now = Date.now();
  const missingResult = fixtures.filter((f) => !f.result);
  const stuck = missingResult.filter(
    (f) => f.kickoff_at && new Date(f.kickoff_at).getTime() + STUCK_AFTER_MS < now
  );

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

  if (stuck.length === 0 && forceClosedGameweeks.length === 0) {
    return null;
  }

  return (
    <div className="card !p-4 mb-6">
      <span className="font-extrabold text-[15px]">Gameweeks</span>

      {stuck.length > 0 && (
        <div className="mt-2">
          <p className="text-[12px] text-sub">
            Gameweek {gameweekNumber} is current, but {stuck.length} fixture
            {stuck.length === 1 ? "" : "s"} kicked off over 4 hours ago and still{" "}
            {stuck.length === 1 ? "has" : "have"} no result:
          </p>
          <ul className="text-[12.5px] text-ink mt-1.5 mb-2.5 list-disc list-inside">
            {stuck.map((f) => (
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
                Only do this if {stuck.length === 1 ? "that fixture is" : "those fixtures are"} never
                going to get a real result (postponed for good, abandoned, etc) — not just running late.
                Anyone who picked a team still waiting on a result here won&apos;t score for this
                gameweek — and you can undo this below if needed.
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
        <div className={stuck.length > 0 ? "mt-4 pt-3 border-t border-line" : "mt-2"}>
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
