"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setResult } from "./actions";
import type { FixtureWithTeamsAndResult } from "@/lib/types";

type FixtureRow = FixtureWithTeamsAndResult & { gameweek_number: number };

export default function SetResult({ fixtures }: { fixtures: FixtureRow[] }) {
  const router = useRouter();
  const [fixtureId, setFixtureId] = useState("");
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const hg = parseInt(homeGoals, 10);
    const ag = parseInt(awayGoals, 10);
    if (!fixtureId) {
      setError("Pick a fixture");
      return;
    }
    if (Number.isNaN(hg) || Number.isNaN(ag)) {
      setError("Enter both scores");
      return;
    }

    setSaving(true);
    const res = await setResult(fixtureId, hg, ag);
    setSaving(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setFixtureId("");
    setHomeGoals("");
    setAwayGoals("");
    router.refresh();
  }

  return (
    <div className="card !p-4 mb-6">
      <span className="font-extrabold text-[15px]">Enter a result</span>
      <p className="text-[12px] text-sub mt-0.5 mb-3">
        For when the automatic pull hasn&apos;t picked up a match yet, or got it wrong.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <select
          value={fixtureId}
          onChange={(e) => setFixtureId(e.target.value)}
          className="w-full px-3.5 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-[13.5px] outline-none focus:border-brandGreen"
        >
          <option value="">Select a fixture…</option>
          {fixtures.map((f) => {
            const current = f.result ? ` — currently ${f.result.home_goals}-${f.result.away_goals}` : "";
            return (
              <option key={f.id} value={f.id}>
                GW{f.gameweek_number}: {f.home_team.name} vs {f.away_team.name}
                {current}
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-2.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Home"
            value={homeGoals}
            onChange={(e) => setHomeGoals(e.target.value)}
            className="w-full px-3.5 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-[14px] outline-none focus:border-brandGreen text-center"
          />
          <span className="text-subDim font-bold">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Away"
            value={awayGoals}
            onChange={(e) => setAwayGoals(e.target.value)}
            className="w-full px-3.5 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-[14px] outline-none focus:border-brandGreen text-center"
          />
        </div>

        {error && <p className="text-red text-xs">{error}</p>}
        {saved && <p className="text-brandGreen text-xs font-bold">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3 rounded-xl font-extrabold text-[14px]"
        >
          {saving ? "Saving…" : "Save result"}
        </button>
      </form>
    </div>
  );
}
