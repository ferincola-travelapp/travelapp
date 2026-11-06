import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * PUBLIC_ROUTES – paths that never require authentication.
 * Everything else in the ecosystem is considered protected.
 */
const PUBLIC_ROUTES = ["/login", "/registro", "/landing", "/marketplace", "/canjes", "/rewards", "/afiliados", "/politica-de-cookies", "/checkout", "/lunaviajera", "/descargas", "/descargar", "/apk", "/buses", "/pasajes"];

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

  // Redirigir antiguo telón /landing/preparate a la raíz correspondiente
  if (cleanPath === "/landing/preparate" || cleanPath === "/preparate") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ─── 0. DIRECT APK DOWNLOAD SHORTLINKS (WHATSAPP 1-CLICK) ──────────────────
  const DIRECT_APK_REDIRECTS: Record<string, string> = {
    "/apk/usuario": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=37935279-e972-46f4-96ad-efc841a1c7ee",
    "/apk/conductor": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=de915007-552a-4f06-88a4-a3ae6bcaea90",
    "/apk/supervisor": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=82a48a99-ee4e-4693-bbe3-9848c99d36cd",
    "/descargar/usuario": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=37935279-e972-46f4-96ad-efc841a1c7ee",
    "/descargar/conductor": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=de915007-552a-4f06-88a4-a3ae6bcaea90",
    "/descargar/supervisor": "https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=82a48a99-ee4e-4693-bbe3-9848c99d36cd",
  };
  if (DIRECT_APK_REDIRECTS[cleanPath]) {
    return NextResponse.redirect(DIRECT_APK_REDIRECTS[cleanPath], 307);
  }

  // ─── 1. DOMAIN-SPECIFIC REWRITES (TOP PRIORITY) ────────────────────────────

  // A) afiliados.travelapp.ar ➡️ Landing de Afiliados directamente
  if (hostname.includes("afiliados")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/afiliados", request.url));
    }
  }

  // B) experience.travelapp.ar ➡️ Landing de Experience & Marketplace Receptivo
  const isExperienceHost = (hostname.includes("experience") && !hostname.includes("travelapp.ar")) || hostname.startsWith("experience.");
  if (isExperienceHost) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/experience", request.url));
    }
    if (cleanPath === "/marketplace" || cleanPath === "/marketplaces") {
      return NextResponse.rewrite(new URL("/landing/experience/marketplace", request.url));
    }
    if (cleanPath === "/buses" || cleanPath === "/pasajes") {
      const url = new URL("/buses", request.url);
      if (!url.searchParams.has("brand")) url.searchParams.set("brand", "experience");
      return NextResponse.rewrite(url);
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

  // E) lunaviajera.travelapp.ar / lunaviajera.ar ➡️ Landing de Luna Viajera directamente
  if (hostname.includes("lunaviajera")) {
    if (cleanPath === "" || cleanPath === "/home") {
      return NextResponse.rewrite(new URL("/landing/lunaviajera", request.url));
    }
    if (cleanPath === "/experiencias" || cleanPath === "/excursiones") {
      return NextResponse.rewrite(new URL("/landing/lunaviajera#experiencias", request.url));
    }
    if (cleanPath === "/buses" || cleanPath === "/pasajes") {
      const url = new URL("/buses", request.url);
      if (!url.searchParams.has("brand")) url.searchParams.set("brand", "lunaviajera");
      return NextResponse.rewrite(url);
    }
  }

  // ─── 2. GLOBAL PUBLIC REWRITES ─────────────────────────────────────────────

  if (cleanPath === "/pasajes") {
    return NextResponse.rewrite(new URL("/buses", request.url));
  }

  // La landing pública de Luna Viajera
  if (cleanPath === "/lunaviajera") {
    return NextResponse.rewrite(new URL("/landing/lunaviajera", request.url));
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
  if (hostname.includes("travelapp.ar") && !hostname.startsWith("admin.") && !hostname.startsWith("experience.") && !hostname.startsWith("rewards.") && !hostname.startsWith("afiliados.") && !hostname.startsWith("lunaviajera.")) {
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
