import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * PUBLIC_ROUTES – paths that never require authentication.
 * Everything else in the ecosystem is considered protected.
 */
const PUBLIC_ROUTES = ["/login", "/landing", "/marketplace", "/canjes", "/rewards", "/afiliados", "/politica-de-cookies"];

/**
 * SESSION_COOKIE – lightweight presence signal set by AuthContext on login/logout.
 * AuthContext sets/clears this cookie via document.cookie.
 */
const SESSION_COOKIE = "ta_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = hostHeader.toLowerCase().split(":")[0];
  const cleanPath = pathname.replace(/\/$/, "");

  // ─── 1. DOMAIN-SPECIFIC REWRITES (TOP PRIORITY) ────────────────────────────

  // A) afiliados.travelapp.ar ➡️ Landing de Afiliados directamente
  if (hostname.includes("afiliados")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/afiliados", request.url));
    }
  }

  // B) experience.travelapp.ar ➡️ Landing de Experience directamente
  if (hostname.includes("experience") && !hostname.includes("travelapp.ar")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/experience", request.url));
    }
  }
  if (hostname.startsWith("experience.")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/experience", request.url));
    }
  }

  // C) rewards.travelapp.ar ➡️ Landing de Rewards directamente
  if (hostname.startsWith("rewards.")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/rewards", request.url));
    }
  }

  // D) travelcab.ar / www.travelcab.ar ➡️ Landing de TravelCab directamente
  if (hostname.includes("travelcab")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/travelcab", request.url));
    }
  }

  // ─── 2. GLOBAL PUBLIC REWRITES ─────────────────────────────────────────────
  
  // El catálogo de marketplace funciona en cualquier dominio del ecosistema
  if (cleanPath === "/marketplace" || cleanPath === "/marketplaces") {
    return NextResponse.rewrite(new URL("/landing/experience/marketplace", request.url));
  }

  // El catálogo de canjes de Rewards funciona públicamente en cualquier dominio
  if (cleanPath === "/canjes") {
    return NextResponse.rewrite(new URL("/landing/rewards/canjes", request.url));
  }

  // La landing pública de Rewards
  if (cleanPath === "/rewards") {
    return NextResponse.rewrite(new URL("/landing/rewards", request.url));
  }

  // La landing pública de Afiliados
  if (cleanPath === "/afiliados") {
    return NextResponse.rewrite(new URL("/landing/afiliados", request.url));
  }

  // ─── 3. INSTITUTIONAL ROOT REWRITE ──────────────────────────────────────────
  if (hostname.includes("travelapp.ar") && !hostname.startsWith("admin.") && !hostname.startsWith("experience.") && !hostname.startsWith("rewards.") && !hostname.startsWith("afiliados.")) {
    if (cleanPath === "" || cleanPath === "/home") {
      // travelapp.ar/ ➡️ landing institucional (ecosistema)
      return NextResponse.rewrite(new URL("/landing/ecosistema", request.url));
    }
    if (cleanPath === "/experience") {
      return NextResponse.rewrite(new URL("/landing/experience", request.url));
    }
    if (cleanPath === "/rewards") {
      return NextResponse.rewrite(new URL("/landing/rewards", request.url));
    }
    if (cleanPath === "/afiliados") {
      return NextResponse.rewrite(new URL("/landing/afiliados", request.url));
    }
  }

  // ─── 2. ALLOW PUBLIC ROUTES WITHOUT AUTH CHECK ─────────────────────────────
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isPublic) {
    return NextResponse.next();
  }

  // ─── 3. ALLOW NEXT.JS INTERNALS AND STATIC FILES ───────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ─── 4. CHECK SESSION COOKIE ────────────────────────────────────────────────
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session || !session.value) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the originally requested URL so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── 5. AUTHENTICATED DOMAIN REWRITES ──────────────────────────────────────
  // travelapp.ar/admin → dashboard principal (requiere sesión activa)
  if (hostname.includes("travelapp.ar") && pathname === "/admin") {
    return NextResponse.rewrite(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all routes EXCEPT:
   *  - _next/static  (static files)
   *  - _next/image   (image optimization)
   *  - favicon.ico
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
