import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components ("use client").
 * Reads the public URL + anon key, which are safe to expose to the browser
 * — access control is enforced by the Row Level Security policies in
 * supabase/migrations/0001_init.sql, not by keeping this key secret.
 *
 * cookieOptions.maxAge is set explicitly here (1 year) because this client
 * is what actually writes the very first auth cookie right after a
 * successful verifyOtp() call — middleware.ts only *refreshes* an existing
 * session on later requests, it doesn't create the first one. Without an
 * explicit maxAge here, that first cookie can end up session-only (cleared
 * when the browser fully closes), which is what "signed in fine, but
 * signed out again after closing and reopening" looks like.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      },
    }
  );
}
