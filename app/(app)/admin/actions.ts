"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestResults, type IngestResultSummary } from "@/lib/ingestResults";

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
