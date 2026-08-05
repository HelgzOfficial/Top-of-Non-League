export const LEAGUE_SLUG = "isthmian-premier";
export const SEASON = "2026-27";

export type Team = {
  id: string;
  league_slug: string;
  name: string;
  short_name: string | null;
  logo_path: string | null;
};

export type Gameweek = {
  id: string;
  league_slug: string;
  season: string;
  number: number;
  deadline_at: string | null;
};

export type Fixture = {
  id: string;
  gameweek_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string | null;
};

export type Result = {
  fixture_id: string;
  home_goals: number;
  away_goals: number;
  status: string;
};

export type FixtureWithTeamsAndResult = Fixture & {
  home_team: Pick<Team, "id" | "name" | "logo_path">;
  away_team: Pick<Team, "id" | "name" | "logo_path">;
  result: Pick<Result, "home_goals" | "away_goals" | "status"> | null;
};

export type ShirtStyle = "solid" | "stripes" | "hoops" | "sleeves" | "sash";

export type Profile = {
  id: string;
  team_name: string;
  league_slug: string;
  shirt_style: ShirtStyle;
  shirt_color: string;
  shirt_trim_color: string;
  shirt_number_color: string;
  shirt_number: number | null;
  avatar_path: string | null;
};

export type Pick_ = {
  id: string;
  profile_id: string;
  gameweek_id: string;
  team_id: string;
};

export type StandingsRow = {
  profile_id: string;
  team_name: string;
  league_slug: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  shirt_style: ShirtStyle;
  shirt_color: string;
  shirt_trim_color: string;
  shirt_number: number | null;
  shirt_number_color: string;
};

// The *real* Isthmian Premier Division table, from actual match results —
// not to be confused with StandingsRow above, which scores managers' picks.
export type LeagueTableRow = {
  team_id: string;
  team_name: string;
  short_name: string | null;
  logo_path: string | null;
  league_slug: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

// One row per team per played fixture, from that team's own perspective —
// powers both "previous results for a team" and the form guide.
export type TeamMatchResult = {
  fixture_id: string;
  league_slug: string;
  gameweek_number: number;
  team_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_logo_path: string | null;
  is_home: boolean;
  goals_for: number;
  goals_against: number;
};

export function matchOutcome(m: Pick<TeamMatchResult, "goals_for" | "goals_against">): "W" | "D" | "L" {
  if (m.goals_for > m.goals_against) return "W";
  if (m.goals_for < m.goals_against) return "L";
  return "D";
}

export function initials(name: string): string {
  const cleaned = name.replace("&", "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
