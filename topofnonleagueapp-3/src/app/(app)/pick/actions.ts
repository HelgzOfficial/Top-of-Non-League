"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubmitPickResult = { ok: true } | { ok: false; message: string };

export async function submitPick(gameweekId: string, teamId: string): Promise<SubmitPickResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You need to sign in again." };
  }

  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("deadline_at")
    .eq("id", gameweekId)
    .maybeSingle();

  if (gameweek?.deadline_at && new Date(gameweek.deadline_at) < new Date()) {
    return { ok: false, message: "Picks are locked for this game week — kickoff has passed." };
  }

  const { error } = await supabase
    .from("picks")
    .upsert(
      { profile_id: user.id, gameweek_id: gameweekId, team_id: teamId },
      { onConflict: "profile_id,gameweek_id" }
    );

  if (error) {
    // The "picks_team_limit" trigger raises a plain Postgres exception when
    // a team has already been picked twice — surface that message as-is.
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
