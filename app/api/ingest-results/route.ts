import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAGUE_SLUG } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  "https://www.footballwebpages.co.uk/isthmian-football-league-premier-division/fixtures-results";

/**
 * Column order, one <td> per column within each fixture <tr> — confirmed
 * against the real page (previously this was guessed blind and was wrong,
 * which is why no results were ever being picked up):
 *   [0] date  [1] status (e.g. "FT")  [2] home team  [3] home goals
 *   [4] away goals  [5] away team  [6] attendance  [7] scorers (optional)
 * The home/away goals are two SEPARATE numeric cells, not one combined
 * "2 - 1"-style cell. Team name cells have the half-time score glued on,
 * e.g. "Billericay Town(0)" or "(0)Cray Wanderers" — stripped out below.
 * Section header rows (e.g. "Saturday 5th April 2025") and not-yet-played
 * rows (kickoff time like "7.45pm" instead of a status/score) are skipped.
 */
const COLUMN_INDEX = { homeTeam: 2, homeGoals: 3, awayGoals: 4, awayTeam: 5 };

// A pure whole number only — deliberately NOT using parseInt()/a loose
// numeric regex on its own, because a kickoff time like "7:45" would
// otherwise parseInt() to 7 and get misread as a goal count.
const WHOLE_NUMBER = /^\d+$/;

function normalizeTeamName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

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

    if (cells.length < 6) return; // section header / non-fixture / unplayed row

    const status = cells[1]?.trim().toUpperCase();
    const homeGoalsRaw = cells[COLUMN_INDEX.homeGoals]?.trim();
    const awayGoalsRaw = cells[COLUMN_INDEX.awayGoals]?.trim();

    // Only ingest confirmed final scores. Postponed/rearranged rows and
    // not-yet-played rows (which show a kickoff time here instead of a
    // whole-number goal count) are skipped rather than guessed at.
    if (status !== "FT") return;
    if (!WHOLE_NUMBER.test(homeGoalsRaw ?? "") || !WHOLE_NUMBER.test(awayGoalsRaw ?? "")) return;

    // Strip the glued-on half-time score, e.g. "Billericay Town(0)" or
    // "(0)Cray Wanderers", before it reaches team-name matching.
    const homeRaw = cells[COLUMN_INDEX.homeTeam]?.replace(/\(\d+\)/g, "").trim();
    const awayRaw = cells[COLUMN_INDEX.awayTeam]?.replace(/\(\d+\)/g, "").trim();
    if (!homeRaw || !awayRaw) return;

    const homeId = resolveTeamId(homeRaw);
    const awayId = resolveTeamId(awayRaw);
    const hg = parseInt(homeGoalsRaw, 10);
    const ag = parseInt(awayGoalsRaw, 10);

    if (!homeId || !awayId) {
      unmatchedRows.push(`${homeRaw} ${hg}-${ag} ${awayRaw}`);
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

// Convenience for manually triggering from a browser while testing, or for
// an external scheduler (e.g. cron-job.org) to hit on a tighter schedule
// than Vercel's own Hobby-plan cron allows (see the Vercel Cron entry in
// vercel.json, which stays as a once-daily safety net): visit
// https://YOUR-DOMAIN/api/ingest-results?secret=YOUR_CRON_SECRET
export async function GET(request: NextRequest) {
  return POST(request);
}
