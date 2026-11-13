import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;

  // 1. Routes publiques explicites : aucune redirection d'authentification
  const isPublicRoute =
    pathname.startsWith("/share") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth");

  // 2. Routes administrateur protégées : `/`, `/dashboard/:path*`, `/clients/:path*`
  const isProtectedAdminRoute =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients");

  if (!isPublicRoute && isProtectedAdminRoute && !request.auth) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Détection dynamique de marque (Alsek vs Vitrine Caladoise) via Host ou query ?brand=
  const host = (request.headers.get("host") || "").toLowerCase();
  const brandQuery = (
    request.nextUrl.searchParams.get("brand") || ""
  ).toLowerCase();

  const domainVitrine = (
    process.env.DOMAIN_VITRINE || "pro.vitrine-caladoise.fr"
  ).toLowerCase();
  const domainAlsek = (
    process.env.DOMAIN_ALSEK || "app.alsek.fr"
  ).toLowerCase();

  let detectedBrand: "ALSEK" | "VITRINE" | "AUTO" = "AUTO";

  if (brandQuery === "vitrine" || brandQuery === "vitrine-caladoise") {
    detectedBrand = "VITRINE";
  } else if (brandQuery === "alsek") {
    detectedBrand = "ALSEK";
  } else if (
    host.includes(domainVitrine) ||
    host.includes("vitrine-caladoise") ||
    host.includes("vitrine")
  ) {
    detectedBrand = "VITRINE";
  } else if (host.includes(domainAlsek) || host.includes("alsek")) {
    detectedBrand = "ALSEK";
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pulse-brand", detectedBrand);
  requestHeaders.set("x-pulse-host", host);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-pulse-brand-detected", detectedBrand);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
