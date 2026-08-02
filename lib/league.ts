import type { SupabaseClient } from "@supabase/supabase-js";
import { LEAGUE_SLUG, type FixtureWithTeamsAndResult, type Gameweek, type StandingsRow } from "@/lib/types";

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
