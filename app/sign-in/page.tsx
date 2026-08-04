"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    // Sends a 6-digit code by email, PROVIDED the "Magic Link" email
    // template in Supabase → Authentication → Email Templates has been
    // edited to include {{ .Token }} — see SETUP.md. Without that edit,
    // Supabase sends a clickable link instead of a code.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="Top of Non League" className="w-10 h-10 rounded-[11px] mb-3" />
        <h1 className="text-xl font-extrabold">Top of Non League</h1>
        <p className="text-xs text-subDim text-center mt-1 max-w-[280px]">
          Isthmian Premier Division · Pick one team a game week · Climb the table
        </p>
      </div>

      <form onSubmit={sendCode} className="card flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-base outline-none focus:border-brandGreen"
          />
        </div>
        {error && <p className="text-red text-xs">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]">
          {loading ? "Sending…" : "Send verification code"}
        </button>
        <p className="text-[11.5px] text-center text-subDim">
          We&apos;ll email you a one-time code — no passwords to forget, and you&apos;ll stay
          signed in on this device.
        </p>
      </form>
    </div>
  );
}
