"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 5;
const MAX_LENGTH = 2000;

export default function ReportForm() {
  const supabase = createClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") ?? pathname;

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = message.trim();
    if (trimmed.length < MIN_LENGTH) {
      setError("A few more details would help — try adding a bit more.");
      return;
    }
    setSending(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      setError("You need to be signed in to send a report.");
      return;
    }
    const { error: insertError } = await supabase.from("bug_reports").insert({
      profile_id: user.id,
      message: trimmed,
      page_path: fromPath,
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
    setMessage("");
  }

  if (sent) {
    return (
      <div className="px-4 pt-8">
        <div className="card text-center py-8">
          <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full text-brandGreen bg-brandGreen/15">
            Sent
          </span>
          <h3 className="text-lg font-extrabold mt-3">Thanks — got it</h3>
          <p className="text-sub text-sm mt-2">
            That&apos;s gone straight through. Feel free to send another if you spot anything else.
          </p>
          <button
            onClick={() => setSent(false)}
            className="btn-primary w-full py-3.5 rounded-2xl font-extrabold text-[14px] mt-5"
          >
            Send another
          </button>
          <Link href="/profile" className="block text-sub text-[13px] underline mt-3">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h3 className="font-extrabold text-[15px] mb-1">Report a bug or issue</h3>
      <p className="text-[13px] text-sub mb-4">
        Found something broken or confusing? Describe it below and it&apos;ll come straight through.
      </p>

      <form onSubmit={submit} className="card flex flex-col gap-3.5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="What happened, and what were you trying to do? Which page/tab, and what device are you on?"
          rows={6}
          className="w-full px-4 py-3.5 rounded-smcard border border-lineHi bg-bg2 text-ink text-[14px] outline-none focus:border-brandGreen resize-none"
        />
        <p className="text-[11px] text-subDim text-right -mt-2">
          {message.trim().length}/{MAX_LENGTH}
        </p>
        {error && <p className="text-red text-xs">{error}</p>}
        <button
          type="submit"
          disabled={sending || message.trim().length < MIN_LENGTH}
          className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]"
        >
          {sending ? "Sending…" : "Send report"}
        </button>
      </form>
    </div>
  );
}
