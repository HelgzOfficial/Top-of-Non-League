import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request so a signed-in
 * user's session doesn't silently expire while the access token is refreshed
 * — this is what keeps people signed in across visits, per the "don't sign
 * users out" requirement.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Force a long-lived cookie explicitly rather than trusting
          // whatever default the library passes in — see the comment in
          // lib/supabase/client.ts for why this matters for staying signed
          // in across browser restarts.
          const persistent: CookieOptions = { ...options, maxAge: options.maxAge ?? 60 * 60 * 24 * 365 };
          request.cookies.set({ name, value, ...persistent });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...persistent });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Touching getUser() is what actually triggers a token refresh when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
