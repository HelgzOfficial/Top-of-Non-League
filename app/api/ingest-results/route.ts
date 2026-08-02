import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAGUE_SLUG } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  "https://www.footballwebpages.co.uk/isthmian-football-league-premier-division/fixtures-results";

/**
 * Column order, one <td> per column within each fixture <tr>:
 *   [0] date  [1] status (e.g. "FT")  [2] home team  [3] score ("0 | 2")
 *   [4] away team  [5] attendance
 * Team name cells have the half-time score glued on, e.g. "Billericay
 * Town(0)" or "(0)Cray Wanderers" — stripped out below before matching.
 * Section header rows (e.g. "Saturday 5th April 2025") are skipped — they
 * don't have enough cells to reach the score column.
 */
const COLUMN_INDEX = { homeTeam: 2, score: 3, awayTeam: 4 };

// Matches "0 | 2" or "2-1" but not a kickoff time like "15:00" (no colon
// in the allowed separator set) so not-yet-played fixture rows are skipped.
const SCORE_PATTERN = /^(\d+)\s*[-–|]\s*(\d+)$/;

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
      headers: {
        // A generic "...Bot/1.0" UA is a common trigger for basic bot
        // filtering on sites like this one, hence the ordinary-browser UA
        // and supporting headers below rather than self-identifying as a bot.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
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

    if (cells.length < 5) return; // section header / non-fixture row

    const scoreCell = cells[COLUMN_INDEX.score]?.trim();
    const scoreMatch = scoreCell?.match(SCORE_PATTERN);
    if (!scoreMatch) return;

    // Strip the glued-on half-time score, e.g. "Billericay Town(0)" or
    // "(0)Cray Wanderers", before it reaches team-name matching.
    const homeRaw = cells[COLUMN_INDEX.homeTeam]?.replace(/\(\d+\)/g, "").trim();
    const awayRaw = cells[COLUMN_INDEX.awayTeam]?.replace(/\(\d+\)/g, "").trim();
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
