"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLogo from "@/components/AppLogo";

// The exact number of digits Supabase puts in the email varies by project
// configuration — hardcoding an exact count here already caused two rounds
// of a real bug (it was wrongly checked against 8, then wrongly "fixed" to
// 6, and either guess blocks a correct code of a different length from
// ever being typed in or submitted). This only requires a sensible minimum
// and lets Supabase's own verifyOtp call be the actual judge of whether
// the code is right, instead of guessing client-side.
const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 12;

export default function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (trimmed.length < MIN_CODE_LENGTH) {
      setError("Enter the code from your email");
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "email",
    });
    setLoading(false);
    if (verifyError) {
      setError("Incorrect or expired code — check and try again");
      return;
    }
    // page.tsx at "/" decides whether to send them to /setup or /home
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center mb-8">
        <AppLogo size={40} className="mb-3" />
        <h1 className="text-xl font-extrabold text-center">Enter your code</h1>
        <p className="text-[13px] text-sub text-center mt-2">
          We sent a code to <span className="text-ink font-bold">{email}</span>
        </p>
      </div>

      <form onSubmit={verify} className="card flex flex-col gap-4">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={MAX_CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH))}
          placeholder="Enter code"
          className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-center text-xl tracking-[6px] font-bold outline-none focus:border-brandGreen"
        />
        {error && <p className="text-red text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.trim().length < MIN_CODE_LENGTH}
          className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/sign-in")}
          className="text-sub text-[13px] underline py-1"
        >
          Use a different email
        </button>
      </form>
    </div>
  );
}
