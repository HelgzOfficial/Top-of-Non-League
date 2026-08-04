"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLogo from "@/components/AppLogo";

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
    if (code.trim().length !== 8) {
      setError("Enter the 8-digit code");
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
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
          We sent an 8-digit code to <span className="text-ink font-bold">{email}</span>
        </p>
      </div>

      <form onSubmit={verify} className="card flex flex-col gap-4">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="--------"
          className="w-full px-4 py-4 rounded-smcard border border-lineHi bg-bg2 text-ink text-center text-xl tracking-[6px] font-bold outline-none focus:border-brandGreen"
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
