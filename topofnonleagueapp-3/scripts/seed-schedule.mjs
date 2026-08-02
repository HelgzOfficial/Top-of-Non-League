// Run this ONCE against a fresh Supabase project to load the 22 Isthmian
// Premier Division clubs and the full 42-gameweek fixture list.
//
//   npm install            # if you haven't already
//   node scripts/seed-schedule.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your
// environment (e.g. `export $(grep -v '^#' .env.local | xargs)` first, or
// run via `npx dotenv -e .env.local -- node scripts/seed-schedule.mjs`).
// The schedule-generation logic itself is unit-tested in
// generate-schedule.test.mjs and doesn't need any dependency to verify.

import { createClient } from "@supabase/supabase-js";
import { TEAMS, generateSchedule } from "./generate-schedule.mjs";

const LEAGUE_SLUG = "isthmian-premier";
const SEASON = "2026-27";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  console.log(`Seeding ${TEAMS.length} teams…`);
  const { data: teamRows, error: teamError } = await supabase
    .from("teams")
    .upsert(
      TEAMS.map((name) => ({ league_slug: LEAGUE_SLUG, name })),
      { onConflict: "league_slug,name" }
    )
    .select("id, name");

  if (teamError) throw teamError;
  const teamIdByName = Object.fromEntries(teamRows.map((t) => [t.name, t.id]));

  const schedule = generateSchedule(TEAMS);
  console.log(`Generated ${schedule.length} game weeks. Seeding gameweeks…`);

  const gameweekRows = [];
  for (let i = 0; i < schedule.length; i++) {
    gameweekRows.push({ league_slug: LEAGUE_SLUG, season: SEASON, number: i + 1 });
  }
  const { data: insertedGws, error: gwError } = await supabase
    .from("gameweeks")
    .upsert(gameweekRows, { onConflict: "league_slug,season,number" })
    .select("id, number");

  if (gwError) throw gwError;
  const gwIdByNumber = Object.fromEntries(insertedGws.map((g) => [g.number, g.id]));

  console.log("Seeding fixtures…");
  const fixtureRows = [];
  schedule.forEach((round, i) => {
    const gameweekId = gwIdByNumber[i + 1];
    round.forEach((m) => {
      fixtureRows.push({
        gameweek_id: gameweekId,
        home_team_id: teamIdByName[m.home],
        away_team_id: teamIdByName[m.away],
      });
    });
  });

  // Insert in batches to stay well under request size limits.
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < fixtureRows.length; i += BATCH_SIZE) {
    const batch = fixtureRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("fixtures").insert(batch);
    if (error) {
      // Fixtures have no natural unique key to upsert on safely, so re-running
      // this script on a non-empty fixtures table will error on duplicates —
      // that's intentional. Wipe the fixtures table first if you need to reseed.
      throw error;
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${fixtureRows.length}`);
  }

  console.log(`Done. ${teamRows.length} teams, ${insertedGws.length} game weeks, ${fixtureRows.length} fixtures.`);
  console.log(
    "Note: kickoff_at / deadline_at were left blank — set these once you have real fixture dates (from the data source), so pick deadlines actually lock on time."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
