"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLogo from "@/components/AppLogo";

// Supabase's email OTP is always a 6-digit code — see
// https://supabase.com/docs/guides/auth/auth-email-passwordless. This used
// to be checked against 8 digits here, which meant a correctly-typed real
// code from Supabase could never pass this check and the request never
// even reached the server — a guaranteed sign-up failure for every new
// user, regardless of device.
const CODE_LENGTH = 6;

export default function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (submittedRef.current) return;
    setError(null);
    const trimmed = code.trim();
    if (trimmed.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code`);
      return;
    }
    submittedRef.current = true;
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "email",
    });
    setLoading(false);
    if (verifyError) {
      submittedRef.current = false;
      setError("Incorrect or expired code — check and try again");
      return;
    }
    // page.tsx at "/" decides whether to send them to /setup or /home
    router.push("/");
    router.refresh();
  }

  // Smoother on mobile: submit automatically the moment all 6 digits are
  // in, instead of making someone find and tap "Verify & continue" on a
  // small screen.
  useEffect(() => {
    if (code.trim().length === CODE_LENGTH) {
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center mb-8">
        <AppLogo size={40} className="mb-3" />
        <h1 className="text-xl font-extrabold text-center">Enter your code</h1>
        <p className="text-[13px] text-sub text-center mt-2">
          We sent a {CODE_LENGTH}-digit code to <span className="text-ink font-bold">{email}</span>
        </p>
      </div>

      <form onSubmit={verify} className="card flex flex-col gap-4">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder="------"
          className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-center text-xl tracking-[8px] font-bold outline-none focus:border-brandGreen"
        />
        {error && <p className="text-red text-xs">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]">
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
