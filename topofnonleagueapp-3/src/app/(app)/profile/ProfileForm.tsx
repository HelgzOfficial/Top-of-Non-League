"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({ initialTeamName }: { initialTeamName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [teamName, setTeamName] = useState(initialTeamName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const trimmed = teamName.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setMessage("Team name must be 2–24 characters");
      return;
    }
    setSaving(true);
    setMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ team_name: trimmed })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Team name updated");
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <>
      <div className="card flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">
            Team name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={24}
            className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-base outline-none focus:border-brandGreen"
          />
        </div>
        {message && <p className="text-xs text-sub">{message}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <button
        onClick={signOut}
        className="w-full py-4 rounded-2xl font-extrabold text-[15px] mt-4 border border-lineHi text-sub"
      >
        Sign out
      </button>
    </>
  );
}
