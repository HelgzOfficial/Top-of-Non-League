import { createClient } from "@/lib/supabase/server";
import { getAllFixturesWithGameweek, getAllTeamMatchResults, getAllTeams, getLeagueTable } from "@/lib/league";
import LeagueView from "@/components/LeagueView";

export default async function LeaguePage() {
  const supabase = createClient();

  const [leagueTable, teams, allResults, fixtures] = await Promise.all([
    getLeagueTable(supabase),
    getAllTeams(supabase),
    getAllTeamMatchResults(supabase),
    getAllFixturesWithGameweek(supabase),
  ]);

  return (
    <LeagueView leagueTable={leagueTable} teams={teams} allResults={allResults} fixtures={fixtures} />
  );
}
