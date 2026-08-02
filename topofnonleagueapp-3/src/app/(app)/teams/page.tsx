import { createClient } from "@/lib/supabase/server";
import { getAllTeams, getPickCounts } from "@/lib/league";
import TeamCrest from "@/components/TeamCrest";

export default async function TeamsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [teams, pickCounts] = await Promise.all([
    getAllTeams(supabase),
    getPickCounts(supabase, user!.id),
  ]);

  return (
    <div className="px-4 pt-6">
      <div className="mb-4">
        <h3 className="font-extrabold text-[15px]">Your teams</h3>
        <p className="text-xs text-sub mt-0.5">Each team can be picked twice this season</p>
      </div>

      <div className="card mb-3.5">
        <p className="text-[12.5px] text-sub">
          Every club in the Isthmian Premier Division can be your pick{" "}
          <b className="text-ink">twice</b> across the season. Once you&apos;ve used both picks on
          a team, it&apos;s off the table for good.
        </p>
      </div>

      <div className="card">
        {teams.map((t: any, i: number) => {
          const used = pickCounts[t.id] ?? 0;
          const left = 2 - used;
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <div className="flex items-center gap-3">
                <TeamCrest name={t.name} logoPath={t.logo_path} />
                <span className="text-sm">{t.name}</span>
              </div>
              <span
                className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full ${
                  left === 2
                    ? "text-sub bg-white/[0.06]"
                    : left === 1
                    ? "text-gold bg-gold/15"
                    : "text-red bg-red/15"
                }`}
              >
                {left === 0 ? "Fully used" : `${left} left`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
