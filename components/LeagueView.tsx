"use client";

import { useMemo, useState } from "react";
import TeamCrest from "@/components/TeamCrest";
import { matchOutcome, type LeagueTableRow, type TeamMatchResult } from "@/lib/types";

type TeamLite = { id: string; name: string; short_name: string | null; logo_path: string | null };

type FixtureRow = {
  id: string;
  gameweek_number: number;
  home_team: Pick<TeamLite, "id" | "name" | "logo_path">;
  away_team: Pick<TeamLite, "id" | "name" | "logo_path">;
  result: { home_goals: number; away_goals: number; status: string } | null;
};

const SECTIONS = [
  { key: "table", label: "Table" },
  { key: "form", label: "Form" },
  { key: "fixtures", label: "Fixtures" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

function OutcomeBadge({ outcome }: { outcome: "W" | "D" | "L" }) {
  const styles =
    outcome === "W"
      ? "text-brandGreen bg-brandGreen/15"
      : outcome === "D"
      ? "text-gold bg-gold/15"
      : "text-red bg-red/15";
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-extrabold ${styles}`}>
      {outcome}
    </span>
  );
}

export default function LeagueView({
  leagueTable,
  teams,
  allResults,
  fixtures,
}: {
  leagueTable: LeagueTableRow[];
  teams: TeamLite[];
  allResults: TeamMatchResult[];
  fixtures: FixtureRow[];
}) {
  const [section, setSection] = useState<Section>("table");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const formGuide = useMemo(() => {
    return teams
      .map((team) => {
        const recent = allResults
          .filter((r) => r.team_id === team.id)
          .slice(0, 5)
          .reverse(); // allResults is most-recent-first; reverse for oldest→newest reading
        return { team, recent };
      })
      .sort((a, b) => a.team.name.localeCompare(b.team.name));
  }, [teams, allResults]);

  const teamHistory = useMemo(
    () => (selectedTeamId ? allResults.filter((r) => r.team_id === selectedTeamId) : []),
    [allResults, selectedTeamId]
  );

  const fixturesByGameweek = useMemo(() => {
    const grouped = new Map<number, FixtureRow[]>();
    for (const f of fixtures) {
      if (!grouped.has(f.gameweek_number)) grouped.set(f.gameweek_number, []);
      grouped.get(f.gameweek_number)!.push(f);
    }
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="mb-4">
        <h3 className="font-extrabold text-[15px]">League</h3>
        <p className="text-xs text-sub mt-0.5">Isthmian Premier Division · real results, official table</p>
      </div>

      <div className="flex gap-1.5 mb-4 bg-bg2 p-1 rounded-2xl border border-line">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex-1 py-2 rounded-xl text-[12.5px] font-extrabold transition-all ${
              section === s.key ? "bg-brandGreen text-[#06150e]" : "text-sub"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "table" && (
        <div className="card !p-4">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">#</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-left">Team</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">P</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">W</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">D</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">L</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">GD</th>
                <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {leagueTable.map((row, i) => (
                <tr key={row.team_id}>
                  <td className="py-2.5 text-center font-extrabold text-sub border-t border-line">{i + 1}</td>
                  <td className="py-2.5 text-left font-bold border-t border-line">
                    <span className="flex items-center gap-2">
                      <TeamCrest name={row.team_name} logoPath={row.logo_path} size={20} />
                      {row.team_name}
                    </span>
                  </td>
                  <td className="py-2.5 text-center border-t border-line">{row.played}</td>
                  <td className="py-2.5 text-center border-t border-line">{row.won}</td>
                  <td className="py-2.5 text-center border-t border-line">{row.drawn}</td>
                  <td className="py-2.5 text-center border-t border-line">{row.lost}</td>
                  <td className="py-2.5 text-center border-t border-line">
                    {row.goal_difference > 0 ? "+" : ""}
                    {row.goal_difference}
                  </td>
                  <td className="py-2.5 text-center font-black border-t border-line">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leagueTable.length === 0 && (
            <p className="text-sub text-sm py-3 text-center">No results ingested yet.</p>
          )}
        </div>
      )}

      {section === "form" && (
        <div className="flex flex-col gap-2.5">
          {formGuide.map(({ team, recent }) => (
            <div key={team.id} className="card !p-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-sm font-bold">
                <TeamCrest name={team.name} logoPath={team.logo_path} size={22} />
                {team.name}
              </span>
              <div className="flex gap-1">
                {recent.length === 0 ? (
                  <span className="text-[11px] text-subDim">No matches yet</span>
                ) : (
                  recent.map((r) => <OutcomeBadge key={r.fixture_id} outcome={matchOutcome(r)} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "fixtures" && (
        <div>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-4 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-sm font-bold outline-none focus:border-brandGreen mb-3.5"
          >
            <option value="">All teams — full fixture list</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — previous results
              </option>
            ))}
          </select>

          {selectedTeamId ? (
            <div className="flex flex-col gap-2">
              {teamHistory.length === 0 && (
                <p className="text-sub text-sm py-3 text-center">No results for this team yet.</p>
              )}
              {teamHistory.map((r) => {
                const outcome = matchOutcome(r);
                return (
                  <div key={r.fixture_id} className="card !p-3.5 flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm font-bold">
                      <TeamCrest name={r.opponent_name} logoPath={r.opponent_logo_path} size={22} />
                      <span>
                        {r.is_home ? "vs" : "at"} {r.opponent_name}
                        <span className="block text-[10.5px] text-subDim font-normal">GW {r.gameweek_number}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="font-black text-sm">
                        {r.goals_for} - {r.goals_against}
                      </span>
                      <OutcomeBadge outcome={outcome} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {fixturesByGameweek.map(([gwNumber, gwFixtures]) => (
                <div key={gwNumber}>
                  <p className="text-[10.5px] text-subDim uppercase tracking-wide font-bold mb-1.5 px-0.5">
                    Gameweek {gwNumber}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {gwFixtures.map((f) => (
                      <div key={f.id} className="card !p-3 flex items-center justify-between text-[12.5px]">
                        <span className="flex items-center gap-2 font-bold flex-1 justify-end text-right">
                          {f.home_team.name}
                          <TeamCrest name={f.home_team.name} logoPath={f.home_team.logo_path} size={18} />
                        </span>
                        <span className="px-3 font-black text-sub shrink-0">
                          {f.result ? `${f.result.home_goals} - ${f.result.away_goals}` : "v"}
                        </span>
                        <span className="flex items-center gap-2 font-bold flex-1">
                          <TeamCrest name={f.away_team.name} logoPath={f.away_team.logo_path} size={18} />
                          {f.away_team.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
