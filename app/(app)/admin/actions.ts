"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestResults, type IngestResultSummary } from "@/lib/ingestResults";

// ScraperAPI's "render" mode (a real headless browser) can take a while,
// and this can also fall through to a slower "premium"/"ultra_premium"
// mode — give it real room rather than hitting the default function
// timeout partway through a request that would otherwise have succeeded.
export const maxDuration = 60;

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
