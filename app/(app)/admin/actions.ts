"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestResults, type IngestResultSummary } from "@/lib/ingestResults";
import { LEAGUE_SLUG } from "@/lib/types";

const ADMIN_EMAIL = "helgzofficial@gmail.com";

export type PullResultsResponse =
  | { ok: true; summary: IngestResultSummary }
  | { ok: false; error: string };

/**
 * Lets the admin manually pull the latest results from Football Web Pages
 * on demand, from a button on the Admin dashboard — same scrape-and-upsert
 * logic as the scheduled/cron route (app/api/ingest-results/route.ts), just
 * gated on the caller's signed-in admin session instead of CRON_SECRET.
 * Re-derives the caller's identity from the session cookie rather than
 * trusting anything the client sends, same pattern as every admin_get_*
 * database function.
 */
export async function pullResults(): Promise<PullResultsResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  try {
    const summary = await ingestResults(createAdminClient());
    return { ok: true, summary };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

export type SetResultResponse = { ok: true } | { ok: false; error: string };

/**
 * Lets the admin type in a final score by hand for a fixture — the
 * always-works fallback for whenever the automatic scraper is blocked or
 * hasn't run yet. Same underlying write as ingestResults() (an upsert into
* `results` keyed on fixture_id, via the service-role client since regular
 * users have no write access to that table), just admin-supplied instead
 * of scraped.
 */
export async function setResult(
  fixtureId: string,
  homeGoals: number,
  awayGoals: number
): Promise<SetResultResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    return { ok: false, error: "Scores must be whole numbers, 0 or higher" };
  }

  if (!fixtureId) {
    return { ok: false, error: "Pick a fixture" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("results")
    .upsert(
      { fixture_id: fixtureId, home_goals: homeGoals, away_goals: awayGoals, status: "FT" },
      { onConflict: "fixture_id" }
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
export type ForceCloseGameweekResponse = { ok: true } | { ok: false; error: string };

/**
 * Manually pushes the "current" gameweek forward past one that will never
 * get a complete set of results (a permanently postponed/abandoned
 * fixture) — the escape hatch for getCurrentGameweek() (lib/league.ts),
 * which otherwise only advances once every fixture in a gameweek has a
 * recorded result. Deliberately just inserts a marker row; never touches
 * `results` or `standings`, so this can't affect anyone's score, only
 * which gameweek people get to pick for.
 */
export async function forceCloseGameweek(gameweekId: string): Promise<ForceCloseGameweekResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  if (!gameweekId) {
    return { ok: false, error: "Pick a gameweek" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("gameweek_force_closes")
    .upsert({ gameweek_id: gameweekId }, { onConflict: "gameweek_id" });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Undoes forceCloseGameweek() — puts a gameweek back into normal,
 * results-driven advancement. */
export async function reopenGameweek(gameweekId: string): Promise<ForceCloseGameweekResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("gameweek_force_closes").delete().eq("gameweek_id", gameweekId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
export type SetGameweekOverrideResponse = { ok: true } | { ok: false; error: string };

/**
 * The direct "set the current gameweek to N" control — bypasses
 * getCurrentGameweek()'s force-close/auto-detect logic entirely. Once set,
 * every page that calls getCurrentGameweek() (Pick, Home) shows exactly
 * this gameweek, regardless of what state any fixture's results are in.
 */
export async function setGameweekOverride(gameweekId: string): Promise<SetGameweekOverrideResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  if (!gameweekId) {
    return { ok: false, error: "Pick a gameweek" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("gameweek_override")
    .upsert({ league_slug: LEAGUE_SLUG, gameweek_id: gameweekId }, { onConflict: "league_slug" });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Clears the manual override — goes back to normal, results-driven
 * auto-detection of the current gameweek. */
export async function clearGameweekOverride(): Promise<SetGameweekOverrideResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, error: "Not authorized" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("gameweek_override").delete().eq("league_slug", LEAGUE_SLUG);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
