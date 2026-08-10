"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGameweekOverride, clearGameweekOverride } from "./actions";

type Props = {
  allGameweeks: { id: string; number: number }[];
  currentNumber: number | null;
  overrideActive: boolean;
};

/**
 * The direct, guaranteed-to-work "set the current gameweek to N" control.
 * Unlike AdvanceGameweek (which only offers to skip a gameweek once its
 * fixtures look genuinely stuck), this is a plain manual pin — pick any
 * gameweek from the dropdown and every page that shows "the current
 * gameweek" (Pick, Home) will show exactly that one, no auto-detection
 * involved at all.
 */
export default function CurrentGameweekControl({ allGameweeks, currentNumber, overrideActive }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSet() {
    if (!selected) {
      setError("Pick a gameweek");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await setGameweekOverride(selected);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected("");
    router.refresh();
  }

  async function handleClear() {
    setBusy(true);
    setError(null);
    const res = await clearGameweekOverride();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card !p-4 mb-6">
      <span className="font-extrabold text-[15px]">Current gameweek</span>
      <p className="text-[12px] text-sub mt-0.5 mb-3">
        {currentNumber !== null ? (
          <>
            Showing <span className="text-ink font-bold">Gameweek {currentNumber}</span> to everyone right
            now{overrideActive ? " — manually set." : " — worked out automatically from results."}
          </>
        ) : (
          "No gameweek is currently showing."
        )}
      </p>

      <div className="flex items-center gap-2.5 mb-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3.5 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-[13.5px] outline-none focus:border-brandGreen"
        >
          <option value="">Set gameweek to…</option>
          {allGameweeks.map((gw) => (
            <option key={gw.id} value={gw.id}>
              Gameweek {gw.number}
            </option>
          ))}
        </select>
        <button
          onClick={handleSet}
          disabled={busy}
          className="btn-primary py-3 px-4 rounded-xl font-extrabold text-[13px] whitespace-nowrap"
        >
          {busy ? "Setting…" : "Set"}
        </button>
      </div>

      {overrideActive && (
        <button onClick={handleClear} disabled={busy} className="text-[12px] font-bold text-subDim underline">
          {busy ? "Clearing…" : "Clear — go back to automatic"}
        </button>
      )}

      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
