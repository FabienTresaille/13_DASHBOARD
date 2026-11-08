import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
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

  // 1. Priorité au query param en local (?brand=vitrine ou ?brand=alsek)
  if (brandQuery === "vitrine" || brandQuery === "vitrine-caladoise") {
    detectedBrand = "VITRINE";
  } else if (brandQuery === "alsek") {
    detectedBrand = "ALSEK";
  }
  // 2. Détection automatique via le Host HTTP (Traefik multi-domaine)
  else if (
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
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
