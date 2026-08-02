import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAGUE_SLUG } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  "https://www.footballwebpages.co.uk/isthmian-football-league-premier-division/fixtures-results";

/**
 * ⚠️ IMPORTANT — read before relying on this in production.
 *
 * This route was written without the ability to fetch the live page's raw
 * HTML from the build sandbox (network access to arbitrary sites is
 * restricted there), so the column layout below is based on a structural
 * description of the page rather than a tested selector. Before you turn
 * on the Vercel Cron for this route:
 *   1. View the page source of SOURCE_URL yourself (or run this route once
 *      and check the `debug.unmatchedRows` / `debug.parsedSample` fields in
 *      its JSON response).
 *   2. Adjust COLUMN_INDEX below if the real column order differs.
 *   3. Consider emailing Football Web Pages about a licensed data feed —
 *      more reliable than scraping and won't break on a site redesign.
 *
 * Column order assumed, one <td> per column within each fixture <tr>:
 *   [0] date/status  [1] home team  [2] score ("2-1" / "2 1")  [3] away team  [4] attendance
 * Section header rows (e.g. "Saturday 5th April 2025") are skipped — they
 * don't contain a parseable score.
 */
const COLUMN_INDEX = { homeTeam: 1, score: 2, awayTeam: 3 };

const SCORE_PATTERN = /(\d+)\s*[-–:]?\s+?(\d+)/; // matches "2-1", "2 1", "2:1"

function normalizeTeamName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("league_slug", LEAGUE_SLUG);

  if (teamsError || !teams) {
    return NextResponse.json({ error: "could not load teams from database" }, { status: 500 });
  }

  const teamsByNormalizedName = new Map(teams.map((t) => [normalizeTeamName(t.name), t.id]));

  function resolveTeamId(rawName: string): string | null {
    const normalized = normalizeTeamName(rawName);
    if (teamsByNormalizedName.has(normalized)) return teamsByNormalizedName.get(normalized)!;
    // Fallback: contains-match, in case the source appends things like "FC".
    for (const [key, id] of teamsByNormalizedName) {
      if (normalized.includes(key) || key.includes(normalized)) return id;
    }
    return null;
  }

  let html: string;
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TopOfNonLeagueBot/1.0)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    html = await res.text();
  } catch (err: any) {
    return NextResponse.json({ error: "could not fetch source page", detail: String(err) }, { status: 502 });
  }

  const $ = cheerio.load(html);

  const matched: { home: string; away: string; hg: number; ag: number }[] = [];
  const unmatchedRows: string[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((__, td) => $(td).text().trim())
      .get();

    if (cells.length < 4) return; // section header / non-fixture row

    const scoreCell = cells[COLUMN_INDEX.score];
    const scoreMatch = scoreCell?.match(SCORE_PATTERN);
    if (!scoreMatch) return;

    const homeRaw = cells[COLUMN_INDEX.homeTeam];
    const awayRaw = cells[COLUMN_INDEX.awayTeam];
    if (!homeRaw || !awayRaw) return;

    const homeId = resolveTeamId(homeRaw);
    const awayId = resolveTeamId(awayRaw);
    const hg = parseInt(scoreMatch[1], 10);
    const ag = parseInt(scoreMatch[2], 10);

    if (!homeId || !awayId || Number.isNaN(hg) || Number.isNaN(ag)) {
      unmatchedRows.push(`${homeRaw} ${scoreCell} ${awayRaw}`);
      return;
    }

    matched.push({ home: homeId, away: awayId, hg, ag });
  });

  let written = 0;
  const writeErrors: string[] = [];

  for (const m of matched) {
    // Each (home, away) ordered pair occurs exactly once across the season's
    // double round-robin, so this is enough to find the right pre-seeded
    // fixture row — no need to parse gameweek numbers out of the page.
    const { data: fixture } = await supabase
      .from("fixtures")
      .select("id")
      .eq("home_team_id", m.home)
      .eq("away_team_id", m.away)
      .maybeSingle();

    if (!fixture) {
      writeErrors.push(`No pre-seeded fixture found for ${m.home} vs ${m.away}`);
      continue;
    }

    const { error: upsertError } = await supabase
      .from("results")
      .upsert(
        { fixture_id: fixture.id, home_goals: m.hg, away_goals: m.ag, status: "FT" },
        { onConflict: "fixture_id" }
      );

    if (upsertError) {
      writeErrors.push(upsertError.message);
    } else {
      written++;
    }
  }

  return NextResponse.json({
    source: SOURCE_URL,
    fixturesParsed: matched.length,
    resultsWritten: written,
    debug: {
      unmatchedRows: unmatchedRows.slice(0, 20),
      writeErrors: writeErrors.slice(0, 20),
    },
  });
}

// Convenience for manually triggering from a browser while testing —
// remove or protect further before going live if you'd rather POST-only.
export async function GET(request: NextRequest) {
  return POST(request);
}
