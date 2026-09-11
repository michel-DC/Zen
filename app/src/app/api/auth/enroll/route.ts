import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_COOKIE_NAME, deviceSessionMaxAge, isDeviceProtectionEnabled, verifyEnrollmentCode } from "@/lib/security/device-session";

export async function POST(request: Request) {
  if (!isDeviceProtectionEnabled()) return NextResponse.json({ detail: "La protection par appareil n’est pas configurée." }, { status: 503 });
  let payload: { code?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ detail: "Code invalide" }, { status: 422 }); }
  if (!await verifyEnrollmentCode(payload.code)) return NextResponse.json({ detail: "Code incorrect" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: DEVICE_COOKIE_NAME, value: await createDeviceSession(), httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: deviceSessionMaxAge });
  return response;
}
