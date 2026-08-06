"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Candidate = { id: string; team_name: string };

export default function AddUserToLeague({
  leagueId,
  candidates,
}: {
  leagueId: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState(candidates[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    if (!selected) return;
    setAdding(true);
    setMessage(null);
    const { error } = await supabase.rpc("admin_add_user_to_league", {
      p_league_id: leagueId,
      p_profile_id: selected,
    });
    setAdding(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Added");
    router.refresh();
  }

  if (candidates.length === 0) {
    return (
      <p className="text-[11px] text-subDim mt-2.5 pt-2.5 border-t border-line">
        Everyone&apos;s already a member.
      </p>
    );
  }

  return (
    <div className="mt-2.5 pt-2.5 border-t border-line">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full px-2.5 py-2.5 rounded-smcard border border-lineHi bg-bg2 text-ink text-[12.5px] outline-none mb-2"
      >
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.team_name}
          </option>
        ))}
      </select>
      <button
        onClick={add}
        disabled={adding}
        className="w-full text-[12.5px] font-extrabold py-2.5 rounded-full bg-brandGreen/15 text-brandGreen border border-brandGreen/30"
      >
        {adding ? "Adding…" : "+ Add to league"}
      </button>
      {message && <p className="text-[11px] text-sub mt-1.5">{message}</p>}
    </div>
  );
}
