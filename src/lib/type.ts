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

export type Profile = {
  id: string;
  team_name: string;
  league_slug: string;
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
};

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
