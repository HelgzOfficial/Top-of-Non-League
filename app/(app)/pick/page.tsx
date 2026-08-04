import { createClient } from "@/lib/supabase/server";
import {
  getCurrentGameweek,
  getFixturesForGameweek,
  getPickCounts,
  getMyPickForGameweek,
  getGameweekPicks,
} from "@/lib/league";
import PickBoard from "./PickBoard";

export default async function PickPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gameweek = await getCurrentGameweek(supabase);

  if (!gameweek) {
    return (
      <div className="px-4 pt-8">
        <div className="card text-center">
          <h2 className="font-extrabold text-lg">No fixtures loaded yet</h2>
          <p className="text-sub text-sm mt-2">
            Once the season&apos;s fixture list is imported, game weeks will appear here.
          </p>
        </div>
      </div>
    );
  }

  const [fixtures, pickCounts, myPick] = await Promise.all([
    getFixturesForGameweek(supabase, gameweek.id),
    getPickCounts(supabase, user!.id),
    getMyPickForGameweek(supabase, user!.id, gameweek.id),
  ]);

  const deadlinePassed = Boolean(gameweek.deadline_at && new Date(gameweek.deadline_at) < new Date());

  // Only fetch the reveal once it's actually allowed to show — the
  // gameweek_picks view itself also enforces this, so this is just to
  // avoid an unnecessary query while picks are still open.
  const allPicks = deadlinePassed ? await getGameweekPicks(supabase, gameweek.id) : [];

  return (
    <PickBoard
      gameweek={gameweek}
      fixtures={fixtures}
      pickCounts={pickCounts}
      myPick={myPick}
      deadlinePassed={deadlinePassed}
      allPicks={allPicks}
    />
  );
}
