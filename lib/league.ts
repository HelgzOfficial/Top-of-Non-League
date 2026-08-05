import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEAGUE_SLUG,
  type FixtureWithTeamsAndResult,
  type Gameweek,
  type StandingsRow,
  type LeagueTableRow,
  type TeamMatchResult,
  type ShirtStyle,
  type MyLeague,
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

/** Recent form (default: last 5 played matches) for every team, oldest → newest. */
export function buildFormGuide(
  allResults: TeamMatchResult[],
  teams: { id: string; name: string; short_name: string | null; logo_path: string | null }[],
  count = 5
) {
  return teams.map((team) => {
    const recent = allResults
      .filter((r) => r.team_id === team.id)
      .slice(0, count) // allResults is already most-recent-first
      .reverse(); // oldest → newest, for left-to-right reading
    return { team, recent };
  });
}

/** A single team's full result history, most recent first. */
export function getTeamMatchHistory(allResults: TeamMatchResult[], teamId: string): TeamMatchResult[] {
  return allResults.filter((r) => r.team_id === teamId);
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

/** One manager's locked-in pick for a gameweek, once that gameweek's
 * deadline has passed — see getGameweekPicks() below. */
export type GameweekPick = {
  profile_id: string;
  team_name: string;
  shirt_style: ShirtStyle;
  shirt_color: string;
  shirt_trim_color: string;
  shirt_number: number | null;
  shirt_number_color: string;
  picked_team_id: string;
  picked_team_name: string;
  picked_team_short_name: string | null;
  picked_team_logo_path: string | null;
};

/**
 * Every manager's locked-in pick for a gameweek — but only once that
 * gameweek's deadline has passed. Backed by the gameweek_picks view
 * (supabase/migrations/0006_gameweek_picks_reveal.sql), which enforces the
 * deadline gate at the database level: querying this before the deadline
 * simply returns nothing, no matter who asks.
 */
export async function getGameweekPicks(
  supabase: SupabaseClient,
  gameweekId: string
): Promise<GameweekPick[]> {
  const { data, error } = await supabase
    .from("gameweek_picks")
    .select("*")
    .eq("gameweek_id", gameweekId);

  if (error || !data) return [];

  return (data as GameweekPick[]).sort((a, b) => a.team_name.localeCompare(b.team_name));
}
/**
 * Same scoring, same picks, same standings view as getStandings() above —
 * just filtered down to the members of one private league. There's no
 * separate scoring path for private leagues; they're a lens on the one
 * real competition.
 */
export async function getLeagueStandings(
  supabase: SupabaseClient,
  leagueId: string
): Promise<StandingsRow[]> {
  const { data: members } = await supabase
    .from("league_members")
    .select("profile_id")
    .eq("league_id", leagueId);

  const profileIds = (members ?? []).map((m) => m.profile_id as string);
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from("standings")
    .select("*")
    .eq("league_slug", LEAGUE_SLUG)
    .in("profile_id", profileIds);

  if (error || !data) return [];

  return (data as StandingsRow[]).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });
}

/**
 * The private leagues the current user belongs to, with a member count for
 * each — powers the league switcher on the Table tab and the "your
 * leagues" list on the Leagues page.
 */
export async function getMyLeagues(
  supabase: SupabaseClient,
  profileId: string
): Promise<MyLeague[]> {
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("profile_id", profileId);

  const leagueIds = (memberships ?? []).map((m) => m.league_id as string);
  if (leagueIds.length === 0) return [];

  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, join_code, owner_profile_id, created_at")
    .in("id", leagueIds);

  if (!leagues) return [];

  const results: MyLeague[] = [];
  for (const l of leagues) {
    const { count } = await supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("league_id", l.id);
    results.push({ ...l, member_count: count ?? 0 });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates a private league and adds the caller as its first member, in one
 * atomic step handled server-side by create_league() — see
 * supabase/migrations/0007_private_leagues.sql for why this can't just be
 * two plain inserts from here.
 */
export async function createLeague(supabase: SupabaseClient, name: string): Promise<MyLeague> {
  const { data, error } = await supabase.rpc("create_league", { p_name: name }).single();
  if (error || !data) throw new Error(error?.message ?? "Could not create league");
  const league = data as { id: string; name: string; join_code: string; owner_profile_id: string; created_at: string };
  return { ...league, member_count: 1 };
}

/**
 * Joins a private league by its short code, via join_league() — see the
 * same migration for why the lookup has to happen server-side rather than
 * as a plain select from here.
 */
export async function joinLeague(supabase: SupabaseClient, code: string) {
  const { data, error } = await supabase.rpc("join_league", { p_code: code }).single();
  if (error || !data) throw new Error(error?.message ?? "No league found with that code");
  return data as { id: string; name: string; join_code: string };
}

export async function leaveLeague(supabase: SupabaseClient, leagueId: string, profileId: string) {
  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}
// A private league: a friend group sharing a filtered view of the same
// standings everyone else has. Not a separate competition — see
// supabase/migrations/0007_private_leagues.sql.
export type MyLeague = {
  id: string;
  name: string;
  join_code: string;
  owner_profile_id: string;
  created_at: string;
  member_count: number;
};
