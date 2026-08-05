"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMyLeagues, createLeague, joinLeague, leaveLeague } from "@/lib/league";
import type { MyLeague } from "@/lib/types";

export default function LeaguesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [myLeagues, setMyLeagues] = useState<MyLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteUrl, setSiteUrl] = useState("");

  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState(searchParams.get("join") ?? "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const leagues = await getMyLeagues(supabase, user.id);
    setMyLeagues(leagues);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    setSiteUrl(window.location.origin);
    refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = newName.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("League name must be 2–30 characters");
      return;
    }
    setCreating(true);
    try {
      await createLeague(supabase, trimmed);
      setNewName("");
      await refresh();
    } catch (err: any) {
      setError(err.message ?? "Could not create league");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = joinCode.trim();
    if (trimmed.length === 0) {
      setError("Enter a join code");
      return;
    }
    setJoining(true);
    try {
      await joinLeague(supabase, trimmed);
      setJoinCode("");
      router.replace("/leagues");
      await refresh();
    } catch (err: any) {
      setError(err.message ?? "No league found with that code");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave(leagueId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await leaveLeague(supabase, leagueId, user.id);
    await refresh();
  }
  async function handleShare(league: MyLeague) {
    const link = `${siteUrl}/leagues?join=${league.join_code}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `Join ${league.name} on Top of Non League`,
          text: `Join my private league "${league.name}" — code ${league.join_code}`,
          url: link,
        });
        return;
      } catch {
        // user cancelled the share sheet — fall through to copy instead
      }
    }
    await navigator.clipboard.writeText(link);
    setCopiedId(league.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold">Private leagues</h1>
        <p className="text-[13px] text-sub mt-1.5">
          Same picks, same points — a private league just shows you a leaderboard of your friends.
        </p>
      </div>

      <form onSubmit={handleJoin} className="card flex flex-col gap-3 mb-4">
        <label className="text-xs font-bold uppercase tracking-wide text-sub">Join a league</label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          maxLength={6}
          className="w-full px-4 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-center tracking-[3px] font-bold outline-none focus:border-brandGreen"
        />
        <button
          type="submit"
          disabled={joining}
          className="btn-primary w-full py-3 rounded-2xl font-extrabold text-[14px]"
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </form>

      <form onSubmit={handleCreate} className="card flex flex-col gap-3 mb-4">
        <label className="text-xs font-bold uppercase tracking-wide text-sub">Create a league</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Work Mates"
          maxLength={30}
          className="w-full px-4 py-3 rounded-smcard border border-lineHi bg-bg2 text-ink text-base outline-none focus:border-brandGreen"
        />
        <button
          type="submit"
          disabled={creating}
          className="btn-primary w-full py-3 rounded-2xl font-extrabold text-[14px]"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>
      {error && <p className="text-red text-xs mb-4">{error}</p>}

      <div className="text-[11px] font-extrabold uppercase tracking-wide text-subDim mb-2.5 ml-0.5">
        Your leagues
      </div>

      {loading && <p className="text-sub text-sm py-2">Loading…</p>}

      {!loading && myLeagues.length === 0 && (
        <p className="text-sub text-sm py-2">You&apos;re not in any private leagues yet.</p>
      )}
      <div className="flex flex-col gap-2.5">
        {myLeagues.map((l) => (
          <div key={l.id} className="card !p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-[15px]">{l.name}</span>
              <span className="text-[11px] text-subDim">
                {l.member_count} member{l.member_count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] mb-3">
              <span className="text-sub">
                Code: <span className="font-bold tracking-[2px] text-ink">{l.join_code}</span>
              </span>
            </div>
            <button
              onClick={() => handleShare(l)}
              className="btn-primary w-full py-3 rounded-2xl font-extrabold text-[14px] mb-2.5"
            >
              {copiedId === l.id ? "Link copied!" : "Invite friends"}
            </button>
            <div className="flex items-center justify-between">
              <a href={`/table?league=${l.id}`} className="text-sub text-[13px] underline py-1">
                View leaderboard →
              </a>
              <button onClick={() => handleLeave(l.id)} className="text-[12px] text-subDim underline py-1">
                Leave league
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
