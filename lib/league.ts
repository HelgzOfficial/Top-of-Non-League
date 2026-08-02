import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEAGUE_SLUG,
  type FixtureWithTeamsAndResult,
  type Gameweek,
  type StandingsRow,
  type LeagueTableRow,
  type TeamMatchResult,
} from "@/lib/types";

/**
 * The "current" gameweek is the lowest-numbered gameweek that doesn't yet
 * have a result recorded for every one of its fixtures. Once every fixture
 * in a gameweek has a final score, the next gameweek becomes current
 * automatically — there's no manual "advance the season" step to run.
 */
export async function getCurrentGameweek(supabase: SupabaseClient): Promise<Gameweek | null> {
  const { data: gameweeks, error } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("league_slug", LEAGUE_SLUG)
    .order("number", { ascending: true });

  if (error || !gameweeks) return null;

  for (const gw of gameweeks) {
    const { data: fixtures } = await supabase
      .from("fixtures")
      .select("id, results(fixture_id)")
      .eq("gameweek_id", gw.id);

    if (!fixtures || fixtures.length === 0) continue;
    const allPlayed = fixtures.every(
      (f: any) => Array.isArray(f.results) && f.results.length > 0
    );
    if (!allPlayed) return gw;
  }

  // Every gameweek fully played — season's over; show the last one.
  return gameweeks[gameweeks.length - 1] ?? null;
}

export async function getFixturesForGameweek(
  supabase: SupabaseClient,
  gameweekId: string
): Promise<FixtureWithTeamsAndResult[]> {
  const { data, error } = await supabase
    .from("fixtures")
    .select(
      `id, gameweek_id, home_team_id, away_team_id, kickoff_at,
       home_team:teams!fixtures_home_team_id_fkey(id, name, logo_path),
       away_team:teams!fixtures_away_team_id_fkey(id, name, logo_path),
       result:results(home_goals, away_goals, status)`
    )
    .eq("gameweek_id", gameweekId)
    .order("kickoff_at", { ascending: true });

  if (error || !data) return [];

  return data.map((f: any) => ({
    ...f,
    result: Array.isArray(f.result) ? f.result[0] ?? null : f.result ?? null,
  }));
}

/** How many times has this profile already picked each team, this season? */
export async function getPickCounts(
  supabase: SupabaseClient,
  profileId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("picks")
    .select("team_id")
    .eq("profile_id", profileId);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as { team_id: string }[]) {
    counts[row.team_id] = (counts[row.team_id] ?? 0) + 1;
  }
  return counts;
}

export async function getMyPickForGameweek(
  supabase: SupabaseClient,
  profileId: string,
  gameweekId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("picks")
    .select("team_id")
    .eq("profile_id", profileId)
    .eq("gameweek_id", gameweekId)
    .maybeSingle();

  return data?.team_id ?? null;
}

export async function getStandings(supabase: SupabaseClient): Promise<StandingsRow[]> {
  const { data, error } = await supabase
    .from("standings")
    .select("*")
    .eq("league_slug", LEAGUE_SLUG);

  if (error || !data) return [];

  return (data as StandingsRow[]).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });
}

export async function getAllTeams(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_path")
    .eq("league_slug", LEAGUE_SLUG)
    .order("name", { ascending: true });
  return data ?? [];
}
/**
 * The real Isthmian Premier Division table, from actual match results —
 * powers the "Table" section of the League tab. Distinct from
 * getStandings() above, which scores managers' picks for the fantasy game.
 */
export async function getLeagueTable(supabase: SupabaseClient): Promise<LeagueTableRow[]> {
  const { data, error } = await supabase
    .from("league_table")
    .select("*")
    .eq("league_slug", LEAGUE_SLUG);

  if (error || !data) return [];

  return (data as LeagueTableRow[]).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });
}

/**
 * Every played match for every team, most recent first (by our internal
 * gameweek number — the best available proxy for chronological order,
 * since real kickoff dates aren't ingested). Used to build both the
 * all-teams form guide and a single team's result history — fetched once
 * and grouped/sliced in memory rather than issuing 22 separate queries.
 */
export async function getAllTeamMatchResults(supabase: SupabaseClient): Promise<TeamMatchResult[]> {
  const { data, error } = await supabase
    .from("team_match_results")
    .select("*")
    .eq("league_slug", LEAGUE_SLUG)
    .order("gameweek_number", { ascending: false });

  if (error || !data) return [];
  return data as TeamMatchResult[];
}

/** The full season's fixture list (played and upcoming), grouped by gameweek. */
export async function getAllFixturesWithGameweek(
  supabase: SupabaseClient
): Promise<(FixtureWithTeamsAndResult & { gameweek_number: number })[]> {
  const { data, error } = await supabase
    .from("fixtures")
    .select(
      `id, gameweek_id, home_team_id, away_team_id, kickoff_at,
       gameweek:gameweeks!inner(number, league_slug),
       home_team:teams!fixtures_home_team_id_fkey(id, name, logo_path),
       away_team:teams!fixtures_away_team_id_fkey(id, name, logo_path),
       result:results(home_goals, away_goals, status)`
    )
    .eq("gameweek.league_slug", LEAGUE_SLUG)
    .order("gameweek_id", { ascending: true });

  if (error || !data) return [];

  return data
    .map((f: any) => ({
      ...f,
      gameweek_number: Array.isArray(f.gameweek) ? f.gameweek[0]?.number : f.gameweek?.number,
      result: Array.isArray(f.result) ? f.result[0] ?? null : f.result ?? null,
    }))
    .sort((a: any, b: any) => a.gameweek_number - b.gameweek_number);
}
