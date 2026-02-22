import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { supabase, response: responseWithCookies } = createClient(
    request,
    response
  );

  if (!supabase) {
    return responseWithCookies;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/board/");
  const isBoardRoute = pathname.startsWith("/board/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const hasShareToken = searchParams.has("token");

  // Allow board routes with share tokens through (T7 handles auth)
  if (isBoardRoute && hasShareToken) {
    return responseWithCookies;
  }

  // Redirect unauthenticated users from protected routes to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Redirect unverified users to verify-email
  if (
    user &&
    !user.email_confirmed_at &&
    isProtectedRoute &&
    pathname !== "/verify-email"
  ) {
    const url = request.nextUrl.clone();
    const nextValue = pathname + request.nextUrl.search;
    url.pathname = "/verify-email";
    url.searchParams.set("next", nextValue);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes
  if (user && user.email_confirmed_at && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return responseWithCookies;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
