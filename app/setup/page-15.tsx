"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAGUE_SLUG } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = teamName.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setError("Team name must be 2–24 characters");
      return;
    }
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/sign-in");
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      team_name: trimmed,
      league_slug: LEAGUE_SLUG,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="Top of Non League" className="w-10 h-10 rounded-[11px] mb-3" />
        <h1 className="text-xl font-extrabold text-center">Name your team</h1>
        <p className="text-[13px] text-sub text-center mt-2 max-w-[280px]">
          This is how you&apos;ll appear on the Top of Non League table.
        </p>
      </div>

      <form onSubmit={finishSetup} className="card flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">
            Team name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. The Groundhoppers"
            maxLength={24}
            className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-base outline-none focus:border-brandGreen"
          />
        </div>
        {error && <p className="text-red text-xs">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]">
          {loading ? "Saving…" : "Enter the league"}
        </button>
      </form>
    </div>
  );
}
