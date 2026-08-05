import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/league";
import { ordinal } from "@/lib/types";
import ShirtGraphic from "@/components/ShirtGraphic";

export default async function ManagerProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Your own profile is edited from /profile — this read-only view is for
  // looking at other managers, so send the viewer there instead.
  if (params.id === user!.id) {
    redirect("/profile");
  }

  const standings = await getStandings(supabase);
  const rank = standings.findIndex((s) => s.profile_id === params.id);
  const row = rank >= 0 ? standings[rank] : null;

  if (!row) notFound();

  const { data: publicProfile } = await supabase
    .from("public_profiles")
    .select("avatar_path")
    .eq("id", params.id)
    .maybeSingle();

  const avatarUrl = publicProfile?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(publicProfile.avatar_path).data.publicUrl
    : null;

  const gd = row.goal_difference;

  return (
    <div className="px-4 pt-6">
      <Link href="/table" className="text-sub text-[13px] underline mb-4 inline-block">
        ← Back to table
      </Link>

      <div className="card !rounded-[22px] !p-5 flex flex-col items-center text-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={row.team_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-lineHi mb-3"
          />
        ) : (
          <div className="mb-3">
            <ShirtGraphic
              style={row.shirt_style}
              color={row.shirt_color}
              trimColor={row.shirt_trim_color}
              numberColor={row.shirt_number_color}
              number={row.shirt_number}
              size={64}
            />
          </div>
        )}
        <h1 className="text-xl font-extrabold">{row.team_name}</h1>
        <p className="text-[13px] text-subDim mt-1">
          {ordinal(rank + 1)} of {standings.length} · Isthmian Premier
        </p>
      </div>

      <div className="card !rounded-[22px] !p-5 mt-3.5">
        <div className="grid grid-cols-3 gap-2.5">
          <StatBox v={row.points} k="Points" />
          <StatBox v={`${gd > 0 ? "+" : ""}${gd}`} k="Goal diff" />
          <StatBox v={row.played} k="Played" />
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-2.5">
          <StatBox v={row.won} k="Won" />
          <StatBox v={row.drawn} k="Drawn" />
          <StatBox v={row.lost} k="Lost" />
        </div>
      </div>
    </div>
  );
}

function StatBox({ v, k }: { v: string | number; k: string }) {
  return (
    <div className="bg-bg2 rounded-xl px-2 py-2.5 text-center">
      <div className="text-[17px] font-extrabold">{v}</div>
      <div className="text-[10px] text-subDim uppercase tracking-wide mt-0.5">{k}</div>
    </div>
  );
}
