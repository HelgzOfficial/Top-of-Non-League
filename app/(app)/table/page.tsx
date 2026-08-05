import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStandings, getLeagueStandings, getMyLeagues } from "@/lib/league";
import ShirtGraphic from "@/components/ShirtGraphic";

export default async function TablePage({
  searchParams,
}: {
  searchParams: { league?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myLeagues = await getMyLeagues(supabase, user!.id);
  const activeLeague = myLeagues.find((l) => l.id === searchParams.league) ?? null;

  const standings = activeLeague
    ? await getLeagueStandings(supabase, activeLeague.id)
    : await getStandings(supabase);

  return (
    <div className="px-4 pt-6">
      <div className="mb-4">
        <h3 className="font-extrabold text-[15px]">
          {activeLeague ? activeLeague.name : "League table"}
        </h3>
        <p className="text-xs text-sub mt-0.5">
          {activeLeague
            ? `Private league · ${activeLeague.member_count} member${activeLeague.member_count === 1 ? "" : "s"}`
            : "Top of Non League · Isthmian Premier"}
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
        <Link
          href="/table"
          className={`shrink-0 text-[12.5px] font-extrabold px-3.5 py-2 rounded-full border ${
            !activeLeague
              ? "bg-brandGreen/15 border-brandGreen/30 text-brandGreen"
              : "border-line text-sub"
          }`}
        >
          Overall
        </Link>
        {myLeagues.map((l) => (
          <Link
            key={l.id}
            href={`/table?league=${l.id}`}
            className={`shrink-0 text-[12.5px] font-extrabold px-3.5 py-2 rounded-full border whitespace-nowrap ${
              activeLeague?.id === l.id
                ? "bg-brandGreen/15 border-brandGreen/30 text-brandGreen"
                : "border-line text-sub"
            }`}
          >
            {l.name}
          </Link>
        ))}
        <Link
          href="/leagues"
          className="shrink-0 text-[12.5px] font-extrabold px-3.5 py-2 rounded-full border border-dashed border-line text-sub"
        >
          + Leagues
        </Link>
      </div>
      <div className="card !p-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">#</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-left">Team</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">P</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">W</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">D</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">L</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">GD</th>
              <th className="text-[9.5px] text-subDim uppercase tracking-wide font-bold pb-2.5 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.profile_id} className={s.profile_id === user!.id ? "bg-brandGreen/[0.08]" : ""}>
                <td className="py-2.5 text-center font-extrabold text-sub border-t border-line">{i + 1}</td>
                <td
                  className={`py-2.5 text-left font-bold border-t border-line ${
                    s.profile_id === user!.id ? "text-brandGreen" : ""
                  }`}
                >
                  <Link
                    href={s.profile_id === user!.id ? "/profile" : `/profile/${s.profile_id}`}
                    <Link
                    href={s.profile_id === user!.id ? "/profile" : `/profile/${s.profile_id}`}
                    className="flex items-center gap-1.5"
                  >
                    <ShirtGraphic
                      style={s.shirt_style}
                      color={s.shirt_color}
                      trimColor={s.shirt_trim_color}
                      numberColor={s.shirt_number_color}
                      number={s.shirt_number}
                      size={20}
                      className="shrink-0"
                    />
                    <span>
                      {s.team_name}
                      {s.profile_id === user!.id && (
                        <span className="text-[10px] text-subDim font-normal"> (you)</span>
                      )}
                    </span>
                  </Link>
                      {s.team_name}
                      {s.profile_id === user!.id && (
                        <span className="text-[10px] text-subDim font-normal"> (you)</span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="py-2.5 text-center border-t border-line">{s.played}</td>
                <td className="py-2.5 text-center border-t border-line">{s.won}</td>
                <td className="py-2.5 text-center border-t border-line">{s.drawn}</td>
                <td className="py-2.5 text-center border-t border-line">{s.lost}</td>
                <td className="py-2.5 text-center border-t border-line">
                  {s.goal_difference > 0 ? "+" : ""}
                  {s.goal_difference}
                </td>
                <td className="py-2.5 text-center font-black border-t border-line">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {standings.length === 0 && (
          <p className="text-sub text-sm py-3 text-center">
            {activeLeague ? "No one&apos;s in this league yet." : "No one&apos;s joined yet."}
          </p>
        )}
      </div>
      <p className="text-[11px] text-center text-subDim mt-3.5">
        Win = 3pts · Draw = 1pt · Loss = 0pts · GD comes from your picked team&apos;s result each game week
      </p>
    </div>
  );
}
