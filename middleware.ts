import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const LOGIN_PATH = "/admin/login";

/** Paths under /admin that must stay reachable without a session. */
const ADMIN_PUBLIC_PATHS = new Set([LOGIN_PATH, "/admin/login/"]);

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function redirectToLogin(request: NextRequest, reason: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
  url.searchParams.set("reason", reason);

  const redirect = NextResponse.redirect(url);
  redirect.headers.set("x-admin-guard", reason);
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh the auth cookie so sessions stay alive across the app.
  const { response, userId, role, configured } = await updateSession(request);

  if (!isAdminRoute(pathname)) {
    return response;
  }

  // The login screen itself is always reachable.
  if (ADMIN_PUBLIC_PATHS.has(pathname)) {
    return response;
  }

  // Supabase not provisioned yet: fall back to the client-side session guard
  // in app/admin/layout.tsx rather than locking the operator out entirely.
  if (!configured) {
    response.headers.set("x-admin-guard", "supabase-unconfigured");
    return response;
  }

  if (!userId) {
    return redirectToLogin(request, "no-session");
  }

  if (role !== "admin") {
    return redirectToLogin(request, "forbidden");
  }

  response.headers.set("x-admin-guard", "granted");
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT:
     * - /api/*            (route handlers do their own auth)
     * - /_next/static/*   (build assets)
     * - /_next/image/*    (image optimiser)
     * - /favicon.ico, /sw.js, /manifest.webmanifest, /robots.txt, /sitemap.xml
     * - /icons/*, /splash/* (PWA assets)
     * - any file with an extension (png, svg, jpg, css, js, woff2, ...)
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|icons/|splash/|.*\\.[\\w]+$).*)",
  ],
};
