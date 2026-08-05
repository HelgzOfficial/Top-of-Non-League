import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "helgzofficial@gmail.com";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Page-level check for a fast redirect — the real gate is inside the
  // admin_get_* database functions themselves (see
  // supabase/migrations/0010_admin_functions.sql), which reject anyone
  // whose JWT email isn't this exact address, no matter how they're
  // called.
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/home");
  }

  const [{ data: profiles }, { data: leagues }] = await Promise.all([
    supabase.rpc("admin_get_profiles"),
    supabase.rpc("admin_get_leagues"),
  ]);

  const leagueMembers: Record<string, { team_name: string }[]> = {};
  for (const l of leagues ?? []) {
    const { data: members } = await supabase.rpc("admin_get_league_members", {
      p_league_id: l.id,
    });
    leagueMembers[l.id] = members ?? [];
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="text-xl font-extrabold mb-1">Admin</h1>
      <p className="text-[13px] text-sub mb-6">Everyone who&apos;s signed up, and every private league.</p>

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        All users ({profiles?.length ?? 0})
      </div>
      <div className="card !p-4 mb-6">
        {(profiles ?? []).map((p: any, i: number) => (
          <div
            key={p.id}
            className={`flex items-center justify-between py-2 text-[13px] ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="font-semibold">{p.team_name}</span>
            <span className="text-subDim text-[12px]">
              {p.league_count} league{Number(p.league_count) === 1 ? "" : "s"}
            </span>
          </div>
        ))}
        {(profiles ?? []).length === 0 && <p className="text-sub text-sm py-2">No users yet.</p>}
      </div>

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        All private leagues ({leagues?.length ?? 0})
      </div>
      <div className="flex flex-col gap-2.5">
        {(leagues ?? []).map((l: any) => (
          <div key={l.id} className="card !p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-[15px]">{l.name}</span>
              <span className="text-[11px] text-subDim">
                {l.member_count} member{Number(l.member_count) === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[12px] text-sub mb-2">
              Code {l.join_code} · Owner {l.owner_team_name}
            </p>
            <div className="text-[12.5px] text-ink">
              {(leagueMembers[l.id] ?? []).map((m) => m.team_name).join(", ")}
            </div>
          </div>
        ))}
        {(leagues ?? []).length === 0 && <p className="text-sub text-sm py-2">No private leagues yet.</p>}
      </div>
    </div>
  );
}
