"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubmitPickResult = { ok: true } | { ok: false; message: string };

const LOCK_MINUTES_BEFORE_KICKOFF = 90;

export async function submitPick(gameweekId: string, teamId: string): Promise<SubmitPickResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You need to sign in again." };
  }

  // Each fixture locks 90 minutes before ITS OWN kickoff — a game week can
  // have fixtures at different times, so this looks up the specific
  // fixture the chosen team is playing in this week, not a single
  // game-week-wide cutoff.
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, kickoff_at")
    .eq("gameweek_id", gameweekId);

  const fixture = (fixtures ?? []).find(
    (f) => f.home_team_id === teamId || f.away_team_id === teamId
  );

  if (fixture?.kickoff_at) {
    const lockAt = new Date(fixture.kickoff_at).getTime() - LOCK_MINUTES_BEFORE_KICKOFF * 60 * 1000;
    if (Date.now() >= lockAt) {
      return { ok: false, message: "That fixture kicks off too soon — picks for it are locked." };
    }
  }

  const { error } = await supabase
    .from("picks")
    .upsert(
      { profile_id: user.id, gameweek_id: gameweekId, team_id: teamId },
      { onConflict: "profile_id,gameweek_id" }
    );

  if (error) {
    return { ok: false, message: error.message.includes("picked twice")
      ? "That team has already been picked twice this season."
      : error.message };
  }

  revalidatePath("/pick");
  revalidatePath("/home");
  revalidatePath("/teams");
  revalidatePath("/table");
  return { ok: true };
}
