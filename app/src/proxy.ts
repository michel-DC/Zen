import { NextResponse, type NextRequest } from "next/server";
import {
  createDeviceSession,
  deviceSessionMaxAge,
  DEVICE_COOKIE_NAME,
  isDeviceProtectionEnabled,
  verifyDeviceSession,
} from "@/lib/security/device-session";

export async function proxy(request: NextRequest) {
  if (!isDeviceProtectionEnabled()) return NextResponse.next();
  const valid = await verifyDeviceSession(request.cookies.get(DEVICE_COOKIE_NAME)?.value);
  if (valid) {
    // Renouvelle le jeton à bas bruit : l'app reste personnelle sans imposer
    // une reconnexion régulière au seul appareil autorisé.
    const response = NextResponse.next();
    response.cookies.set({
      name: DEVICE_COOKIE_NAME,
      value: await createDeviceSession(),
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      maxAge: deviceSessionMaxAge,
    });
    return response;
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ detail: "Accès privé requis" }, { status: 401 });
  }
  const destination = new URL("/unlock", request.url);
  destination.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js|sw-dev.js|unlock|api/auth/enroll).*)"],
};
