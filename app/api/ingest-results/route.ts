import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestResults } from "@/lib/ingestResults";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Query-param fallback so this can be triggered manually from a plain
  // browser address bar, or by an external scheduler (e.g. cron-job.org)
  // hitting a plain URL — neither can set a custom Authorization header.
  // Vercel Cron always uses the header form; this is for everything else.
  const secretParam = request.nextUrl.searchParams.get("secret");
  return secretParam !== null && secretParam === process.env.CRON_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await ingestResults(createAdminClient());
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 502 });
  }
}

// Convenience for manually triggering from a browser while testing, or for
// an external scheduler (e.g. cron-job.org) to hit on a tighter schedule
// than Vercel's own Hobby-plan cron allows (see the Vercel Cron entry in
// vercel.json, which stays as a once-daily safety net): visit
// https://YOUR-DOMAIN/api/ingest-results?secret=YOUR_CRON_SECRET
//
// There's also an in-app way to trigger this now: the "Pull latest
// results" button on the Admin dashboard, which goes through
// app/(app)/admin/actions.ts's pullResults() instead of this route —
// same underlying ingestResults() logic, gated on the admin's signed-in
// session rather than CRON_SECRET, no URL/secret needed.
export async function GET(request: NextRequest) {
  return POST(request);
}
