import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGameweek, getFixturesForGameweek, getMyPickForGameweek, getStandings } from "@/lib/league";
import { ordinal } from "@/lib/types";

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
  if (gameweek) {
    const fixtures = await getFixturesForGameweek(supabase, gameweek.id);
    const myPick = await getMyPickForGameweek(supabase, user!.id, gameweek.id);
    const allPlayed = fixtures.length > 0 && fixtures.every((f) => f.result);

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

  const gd = (myRow?.goal_difference ?? 0);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-brandGreen to-brandGreenDim flex items-center justify-center font-black text-[#06150e] text-[10.5px]">
            TNL
          </div>
          <span className="font-extrabold text-base">Top of Non League</span>
        </div>
        {gameweek && (
          <span className="text-[11.5px] font-extrabold text-brandGreen bg-brandGreen/10 border border-brandGreen/25 px-3 py-1.5 rounded-full">
            GW {gameweek.number}
          </span>
        )}
      </div>

      <div className="rounded-[22px] p-5 border border-line" style={{ background: "linear-gradient(135deg,#123024,#0d1a15 65%)" }}>
        <p className="text-[11px] uppercase tracking-wide font-extrabold text-subDim">{profile?.team_name}</p>
        <div className="text-4xl font-black leading-none mt-1">
          {myPos >= 0 ? ordinal(myPos + 1) : "-"}{" "}
          <span className="text-sm font-bold text-sub">of {standings.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <StatBox v={myRow?.points ?? 0} k="Points" />
          <StatBox v={`${gd > 0 ? "+" : ""}${gd}`} k="Goal diff" />
          <StatBox v={myRow?.played ?? 0} k="Played" />
        </div>
      </div>

      {gwCard}

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mt-6 mb-2.5 ml-0.5">
        Mini league — top 5
      </div>
      <div className="card">
        {standings.slice(0, 5).map((s, i) => (
          <div
            key={s.profile_id}
            className={`flex items-center justify-between py-2.5 text-[13.5px] ${i > 0 ? "border-t border-line" : ""}`}
          >
            <span className={`font-semibold ${s.profile_id === user!.id ? "text-brandGreen" : ""}`}>
              {i + 1}. {s.team_name}
            </span>
            <span className="font-extrabold bg-bg2 px-2.5 py-1 rounded-lg text-[12.5px]">{s.points} pts</span>
          </div>
        ))}
        {standings.length === 0 && <p className="text-sub text-sm py-2">No one&apos;s on the board yet.</p>}
      </div>
      <div className="text-center mt-2.5">
        <Link href="/table" className="text-sub text-[13px] underline">
          View full table →
        </Link>
      </div>
    </div>
  );
}

function StatBox({ v, k }: { v: string | number; k: string }) {
  return (
    <div className="bg-white/[0.04] rounded-xl px-2 py-2.5 text-center">
      <div className="text-[17px] font-extrabold">{v}</div>
      <div className="text-[10px] text-subDim uppercase tracking-wide mt-0.5">{k}</div>
    </div>
  );
}
