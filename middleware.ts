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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A private-league invite link looks like /leagues?join=CODE. Anyone who
  // isn't fully signed in yet gets redirected away by app/(app)/layout.tsx
  // (to /sign-in if signed out, to /setup if signed in but hasn't named
  // their team yet) — but neither of those redirects carries the join code
  // along, so a brand new user tapping an invite link would sign up
  // successfully and land on /home with no idea what code to enter.
  // Catching it here, before either redirect happens, threads the code
  // through as a "next" param all the way to sign-in → verify → setup, so
  // it survives and they land back on /leagues with it already filled in.
  if (request.nextUrl.pathname === "/leagues" && request.nextUrl.searchParams.has("join")) {
    const nextTarget = request.nextUrl.pathname + request.nextUrl.search;

    if (!user) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("next", nextTarget);
      return NextResponse.redirect(signInUrl);
    }

    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) {
      const setupUrl = new URL("/setup", request.url);
      setupUrl.searchParams.set("next", nextTarget);
      return NextResponse.redirect(setupUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
