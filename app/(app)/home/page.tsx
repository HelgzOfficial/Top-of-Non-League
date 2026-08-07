import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGameweek, getFixturesForGameweek, getMyPickForGameweek, getStandings } from "@/lib/league";
import { ordinal } from "@/lib/types";
import type { FixtureWithTeamsAndResult } from "@/lib/types";
import AppLogo from "@/components/AppLogo";
import LockCountdown from "@/components/LockCountdown";
import KickoffCountdown from "@/components/KickoffCountdown";
import TeamCrest from "@/components/TeamCrest";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name")
    .eq("id", user!.id)
    .maybeSingle();

  const gameweek = await getCurrentGameweek(supabase);
  const standings = await getStandings(supabase);
  const myRow = standings.find((s) => s.profile_id === user!.id);
  const myPos = standings.findIndex((s) => s.profile_id === user!.id);

  let gwCard = null;
  let fixtures: FixtureWithTeamsAndResult[] = [];
  if (gameweek) {
    fixtures = await getFixturesForGameweek(supabase, gameweek.id);
    const myPick = await getMyPickForGameweek(supabase, user!.id, gameweek.id);
    const allPlayed = fixtures.length > 0 && fixtures.every((f) => f.result);

    // The soonest a still-open fixture in this gameweek will lock (90 min
    // before its own kickoff) — used to show "time left to pick at all" on
    // the Home card. null once every fixture has already locked.
    const nextLockAt = fixtures.reduce((earliest: number | null, f) => {
      if (!f.kickoff_at) return earliest;
      const lockAt = new Date(f.kickoff_at).getTime() - 90 * 60 * 1000;
      if (lockAt <= Date.now()) return earliest;
      if (earliest === null || lockAt < earliest) return lockAt;
      return earliest;
    }, null);

    if (!myPick) {
      gwCard = (
        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[15px]">Gameweek {gameweek.number} is open</h3>
            <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full text-gold bg-gold/15">
              Pick needed
            </span>
          </div>
          <p className="text-sub text-[13px] mt-1.5">
            Choose one Isthmian Premier team from this week&apos;s fixtures.
          </p>
          <LockCountdown lockAt={nextLockAt} />
          <Link
            href="/pick"
            className="btn-primary w-full py-3.5 rounded-2xl font-extrabold text-[15px] mt-3.5 flex items-center justify-center"
          >
            Make your pick
          </Link>
        </div>
      );
    } else if (!allPlayed) {
      const fixture = fixtures.find((f) => f.home_team_id === myPick || f.away_team_id === myPick);
      const teamName =
        fixture?.home_team_id === myPick ? fixture?.home_team.name : fixture?.away_team.name;
      gwCard = (
        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[15px]">Gameweek {gameweek.number}</h3>
            <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full text-brandGreen bg-brandGreen/15">
              Pick locked
            </span>
          </div>
          <p className="text-sub text-[13px] mt-1.5">
            You picked <span className="text-ink font-bold">{teamName}</span>. Result pending.
          </p>
        </div>
      );
    } else {
      const fixture = fixtures.find((f) => f.home_team_id === myPick || f.away_team_id === myPick);
      const isHome = fixture?.home_team_id === myPick;
      const gf = isHome ? fixture?.result?.home_goals : fixture?.result?.away_goals;
      const ga = isHome ? fixture?.result?.away_goals : fixture?.result?.home_goals;
      const pts = gf! > ga! ? 3 : gf === ga ? 1 : 0;
      const teamName = isHome ? fixture?.home_team.name : fixture?.away_team.name;
      gwCard = (
        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[15px]">Gameweek {gameweek.number} complete</h3>
            <span
              className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full ${
                pts === 3 ? "text-brandGreen bg-brandGreen/15" : pts === 1 ? "text-gold bg-gold/15" : "text-red bg-red/15"
              }`}
            >
              {pts} pts
            </span>
          </div>
          <p className="text-sub text-[13px] mt-1.5">
            {teamName}: <span className="text-ink font-bold">{gf}-{ga}</span>
          </p>
        </div>
      );
    }
  }
