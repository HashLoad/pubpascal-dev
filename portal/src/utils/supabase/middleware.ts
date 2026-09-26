import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh the session token if it is expired
  // Calling getUser() is required to verify the user and trigger token refresh if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route Protection:
  // If the user is unauthenticated and tries to access /profile or /publish, redirect to /login
  const path = request.nextUrl.pathname;
  if (
    !user &&
    (path.startsWith("/profile") ||
      path.startsWith("/publish") ||
      path.startsWith("/admin"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Also pass the redirect path in query params if they wanted to visit a specific page
    url.searchParams.set("next", path.startsWith("/admin") ? "/admin" : path);
    return NextResponse.redirect(url);
  }

  // If the user is authenticated and goes to /login or /register, redirect to /profile
  if (user && (path === "/login" || path === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
