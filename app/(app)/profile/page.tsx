import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/league";
import type { ShirtStyle } from "@/lib/types";
import ProfileForm from "./ProfileForm";
import ShirtEditor from "@/components/ShirtEditor";
import AvatarUpload from "@/components/AvatarUpload";
import ThemeToggle from "@/components/ThemeToggle";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name, shirt_style, shirt_color, shirt_trim_color, shirt_number_color, shirt_number, avatar_path")
    .eq("id", user!.id)
    .maybeSingle();

  const standings = await getStandings(supabase);
  const myRow = standings.find((s) => s.profile_id === user!.id);

  const avatarUrl = profile?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <div className="px-4 pt-6">
      <h3 className="font-extrabold text-[15px] mb-4">Profile</h3>

      <ThemeToggle />

      <div className="card mt-3.5">
        <AvatarUpload initialUrl={avatarUrl} teamName={profile?.team_name ?? ""} />
      </div>

      <div className="mt-3.5">
        <ProfileForm initialTeamName={profile?.team_name ?? ""} />
      </div>

      <ShirtEditor
        initial={{
          shirt_style: (profile?.shirt_style as ShirtStyle) ?? "solid",
          shirt_color: profile?.shirt_color ?? "#1f8a4c",
          shirt_trim_color: profile?.shirt_trim_color ?? "#ffffff",
          shirt_number_color: profile?.shirt_number_color ?? "#ffffff",
          shirt_number: profile?.shirt_number ?? null,
        }}
      />

      <div className="card mt-3.5">
        <Row label="Email" value={user!.email ?? ""} />
        <Row label="League" value="Isthmian Premier Division" />
        <Row label="Game weeks played" value={String(myRow?.played ?? 0)} />
      </div>
      {user?.email?.toLowerCase() === "helgzofficial@gmail.com" && (
        <Link
          href="/admin"
          className="card mt-3.5 flex items-center justify-between !py-4"
        >
          <span className="font-bold text-[14px]">Admin dashboard</span>
          <span className="text-subDim">→</span>
        </Link>
      )}
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
