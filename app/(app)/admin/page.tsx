import { createClient } from "@/lib/supabase/server";
import AddUserToLeague from "./AddUserToLeague";
import PullResults from "./PullResults";

const ADMIN_EMAIL = "helgzofficial@gmail.com";

type AdminProfile = {
  id: string;
  team_name: string;
  avatar_path: string | null;
  league_count: number;
};

type BugReport = {
  id: string;
  profile_id: string;
  team_name: string;
  message: string;
  page_path: string | null;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Page-level check for a fast redirect — the real gate is inside the
  // admin_get_* / admin_add_user_to_league database functions themselves
  // (see supabase/migrations/0010_admin_functions.sql and
  // 0011_admin_add_user_to_league.sql), which reject anyone whose JWT
  // email isn't this exact address, no matter how they're called. Showing
  // the signed-in email here (instead of a silent redirect) so a mismatch
  // is obvious rather than looking like nothing happened.
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sub text-sm">
          Not authorized. Signed in as: {user?.email ?? "(no email — not signed in?)"}
        </p>
      </div>
    );
  }

  const [{ data: profiles }, { data: leagues }, { data: bugReports }] = await Promise.all([
    supabase.rpc("admin_get_profiles"),
    supabase.rpc("admin_get_leagues"),
    supabase.rpc("admin_get_bug_reports"),
  ]);

  const allProfiles: AdminProfile[] = profiles ?? [];
  const reports: BugReport[] = bugReports ?? [];

  const leagueMembers: Record<string, { profile_id: string; team_name: string }[]> = {};
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

      <PullResults />

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        Bug reports ({reports.length})
      </div>
      <div className="flex flex-col gap-2.5 mb-6">
        {reports.map((r) => (
          <div key={r.id} className="card !p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-[14px]">{r.team_name}</span>
              <span className="text-[11px] text-subDim">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            {r.page_path && <p className="text-[11px] text-subDim mb-1.5">{r.page_path}</p>}
            <p className="text-[13px] text-ink whitespace-pre-wrap">{r.message}</p>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card !p-4">
            <p className="text-sub text-sm">No bug reports yet.</p>
          </div>
        )}
      </div>

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        Overall league
      </div>
      <div className="card !p-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="font-extrabold text-[15px]">Overall</span>
          <span className="text-[11px] text-subDim">
            {allProfiles.length} member{allProfiles.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[12px] text-sub">
          Every signed-up user, automatically — no code needed. This is the default view on the Table
          tab.
        </p>
      </div>

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        All users ({allProfiles.length})
      </div>
      <div className="card !p-4 mb-6">
        {allProfiles.map((p, i) => (
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
        {allProfiles.length === 0 && <p className="text-sub text-sm py-2">No users yet.</p>}
      </div>
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        All private leagues ({leagues?.length ?? 0})
      </div>
      <div className="flex flex-col gap-2.5">
        {(leagues ?? []).map((l: any) => {
          const members = leagueMembers[l.id] ?? [];
          const memberIds = new Set(members.map((m) => m.profile_id));
          const candidates = allProfiles.filter((p) => !memberIds.has(p.id));
          return (
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
              <div className="text-[12.5px] text-ink">{members.map((m) => m.team_name).join(", ")}</div>
              <AddUserToLeague leagueId={l.id} candidates={candidates} />
            </div>
          );
        })}
        {(leagues ?? []).length === 0 && <p className="text-sub text-sm py-2">No private leagues yet.</p>}
      </div>
    </div>
  );
}
