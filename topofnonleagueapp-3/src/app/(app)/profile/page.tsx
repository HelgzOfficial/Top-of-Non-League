import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/league";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name")
    .eq("id", user!.id)
    .maybeSingle();

  const standings = await getStandings(supabase);
  const myRow = standings.find((s) => s.profile_id === user!.id);

  return (
    <div className="px-4 pt-6">
      <h3 className="font-extrabold text-[15px] mb-4">Profile</h3>

      <ProfileForm initialTeamName={profile?.team_name ?? ""} />

      <div className="card mt-3.5">
        <Row label="Email" value={user!.email ?? ""} />
        <Row label="League" value="Isthmian Premier Division" />
        <Row label="Game weeks played" value={String(myRow?.played ?? 0)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-sub">{label}</span>
      <span className="text-[13px] font-bold">{value}</span>
    </div>
  );
}
