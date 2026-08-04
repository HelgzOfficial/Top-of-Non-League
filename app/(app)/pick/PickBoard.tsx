"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FixtureWithTeamsAndResult, Gameweek } from "@/lib/types";
import type { GameweekPick } from "@/lib/league";
import TeamCrest from "@/components/TeamCrest";
import ShirtGraphic from "@/components/ShirtGraphic";
import { submitPick } from "./actions";

export default function PickBoard({
  gameweek,
  fixtures,
  pickCounts,
  myPick,
  deadlinePassed,
  allPicks,
}: {
  gameweek: Gameweek;
  fixtures: FixtureWithTeamsAndResult[];
  pickCounts: Record<string, number>;
  myPick: string | null;
  deadlinePassed: boolean;
  allPicks: GameweekPick[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allPlayed = fixtures.length > 0 && fixtures.every((f) => f.result);

  function allowance(teamId: string) {
    return 2 - (pickCounts[teamId] ?? 0);
  }

  function confirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPick(gameweek.id, selected);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSelected(null);
      router.refresh();
    });
  }

  // --- Already played: show the result ---
  if (myPick && allPlayed) {
    const myFixture = fixtures.find((f) => f.home_team_id === myPick || f.away_team_id === myPick);
    const isHome = myFixture?.home_team_id === myPick;
    const gf = isHome ? myFixture?.result?.home_goals : myFixture?.result?.away_goals;
    const ga = isHome ? myFixture?.result?.away_goals : myFixture?.result?.home_goals;
    const outcome = gf! > ga! ? "W" : gf === ga ? "D" : "L";
    const pts = outcome === "W" ? 3 : outcome === "D" ? 1 : 0;
    const myTeamName = isHome ? myFixture?.home_team.name : myFixture?.away_team.name;
    const oppName = isHome ? myFixture?.away_team.name : myFixture?.home_team.name;

    return (
      <div className="px-4 pt-6">
        <Header gwNumber={gameweek.number} subtitle="Full time" />
        <div className="card text-center">
          <span
            className={`badge ${
              pts === 3 ? "text-brandGreen bg-brandGreen/15" : pts === 1 ? "text-gold bg-gold/15" : "text-red bg-red/15"
            } text-[10.5px] font-extrabold px-2.5 py-1 rounded-full`}
          >
            FULL TIME
          </span>
          <p className="text-2xl font-black mt-3">
            {myTeamName} {gf} - {ga} {oppName}
          </p>
          <p className="text-sub text-sm mt-2">
            You picked <span className="text-ink font-bold">{myTeamName}</span> —{" "}
            {outcome === "W" ? "Win" : outcome === "D" ? "Draw" : "Loss"}
          </p>
          <p className="text-sm font-extrabold mt-3">
            +{pts} pts · GF {gf} · GA {ga} · GD {(gf! - ga!) > 0 ? "+" : ""}
            {gf! - ga!}
          </p>
        </div>
        <PicksReveal picks={allPicks} gwNumber={gameweek.number} myPick={myPick} />
      </div>
    );
  }

  // --- Picked, waiting on results ---
  if (myPick && !allPlayed) {
    const myFixture = fixtures.find((f) => f.home_team_id === myPick || f.away_team_id === myPick);
    const myTeamName =
      myFixture?.home_team_id === myPick ? myFixture?.home_team.name : myFixture?.away_team.name;
    return (
      <div className="px-4 pt-6">
        <Header gwNumber={gameweek.number} subtitle="Pick locked for this game week" />
        <div className="card text-center py-8">
          <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full text-brandGreen bg-brandGreen/15">
            Pick locked
          </span>
          <h3 className="text-lg font-extrabold mt-3">{myTeamName}</h3>
          <p className="text-sub text-sm mt-2">
            Results will appear here automatically once the fixture is played and ingested.
          </p>
        </div>
        {deadlinePassed && <PicksReveal picks={allPicks} gwNumber={gameweek.number} myPick={myPick} />}
      </div>
    );
  }

  // --- Deadline passed and this manager never picked ---
  if (deadlinePassed && !myPick) {
    return (
      <div className="px-4 pt-6">
        <Header gwNumber={gameweek.number} subtitle="Picks are closed for this game week" />
        <div className="card text-center py-8">
          <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full text-red bg-red/15">
            No pick made
          </span>
          <p className="text-sub text-sm mt-3">You didn&apos;t lock in a team before the deadline this week.</p>
        </div>
        <PicksReveal picks={allPicks} gwNumber={gameweek.number} myPick={myPick} />
      </div>
    );
  }

  // --- Choosing ---
  return (
    <div className="px-4 pt-6 pb-6">
      <Header gwNumber={gameweek.number} subtitle="Tap a team from any fixture below" />

      {fixtures.map((f) => (
        <div key={f.id} className="card mb-2.5 !p-3.5">
          <TeamRow
            id={f.home_team_id}
            name={f.home_team.name}
            logoPath={f.home_team.logo_path}
            allowance={allowance(f.home_team_id)}
            selected={selected === f.home_team_id}
            disabled={allowance(f.home_team_id) <= 0}
            onSelect={() => setSelected(f.home_team_id)}
          />
          <div className="text-center text-[10px] text-subDim font-extrabold tracking-widest my-0.5">
            VS · GW{gameweek.number}
          </div>
          <TeamRow
            id={f.away_team_id}
            name={f.away_team.name}
            logoPath={f.away_team.logo_path}
            allowance={allowance(f.away_team_id)}
            selected={selected === f.away_team_id}
            disabled={allowance(f.away_team_id) <= 0}
            onSelect={() => setSelected(f.away_team_id)}
          />
        </div>
      ))}

      {error && <p className="text-red text-xs text-center mb-2">{error}</p>}

      <div className="sticky bottom-[calc(14px+var(--safe-bottom))] mt-2">
        <button
          onClick={confirm}
          disabled={!selected || pending}
          className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]"
        >
          {pending ? "Confirming…" : selected ? `Confirm pick` : "Select a team to continue"}
        </button>
      </div>
    </div>
  );
}

/**
 * Every manager's locked-in team for the gameweek, revealed only once the
 * deadline's passed — the underlying query returns nothing before then
 * (see getGameweekPicks in lib/league.ts), so this simply renders whatever
 * it's handed.
 */
function PicksReveal({
  picks,
  gwNumber,
  myPick,
}: {
  picks: GameweekPick[];
  gwNumber: number;
  myPick: string | null;
}) {
  if (picks.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        This week&apos;s picks — GW{gwNumber}
      </div>
      <div className="card !p-0 overflow-hidden">
        {picks.map((p, i) => (
          <div
            key={p.profile_id}
            className={`flex items-center justify-between gap-2 px-3.5 py-3 ${i > 0 ? "border-t border-line" : ""} ${
              p.picked_team_id === myPick ? "bg-brandGreen/[0.06]" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ShirtGraphic
                style={p.shirt_style}
                color={p.shirt_color}
                trimColor={p.shirt_trim_color}
                numberColor={p.shirt_number_color}
                number={p.shirt_number}
                size={22}
                className="shrink-0"
              />
              <span className="font-bold text-[13px] truncate">{p.team_name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-[12.5px] text-sub">{p.picked_team_name}</span>
              <TeamCrest name={p.picked_team_name} logoPath={p.picked_team_logo_path} size={22} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ gwNumber, subtitle }: { gwNumber: number; subtitle: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-extrabold text-[15px]">Make your pick</h3>
        <p className="text-xs text-sub mt-0.5">{subtitle}</p>
      </div>
      <span className="text-[11.5px] font-extrabold text-brandGreen bg-brandGreen/10 border border-brandGreen/25 px-3 py-1.5 rounded-full">
        GW {gwNumber}
      </span>
    </div>
  );
}

function TeamRow({
  name,
  logoPath,
  allowance,
  selected,
  disabled,
  onSelect,
}: {
  id: string;
  name: string;
  logoPath?: string | null;
  allowance: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border font-bold text-sm transition-all
        ${selected ? "border-brandGreen bg-brandGreen/10" : "border-lineHi bg-bg2"}
        ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
    >
      <span className="flex items-center gap-2.5">
        <TeamCrest name={name} logoPath={logoPath} active={selected} />
        {name}
      </span>
      {disabled ? (
        <span className="text-[10.5px] font-extrabold px-2 py-1 rounded-full text-red bg-red/15">Used</span>
      ) : (
        <span className="flex gap-1">
          {[0, 1].map((n) => (
            <span
              key={n}
              className={`w-1.5 h-1.5 rounded-full ${n < 2 - allowance ? "bg-lineHi" : "bg-brandGreen"}`}
            />
          ))}
        </span>
      )}
    </button>
  );
}
