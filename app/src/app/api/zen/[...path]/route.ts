import { NextResponse, type NextRequest } from "next/server";
import { isDeviceProtectionEnabled, verifyDeviceSession, DEVICE_COOKIE_NAME } from "@/lib/security/device-session";

const workerBaseUrl = (process.env.ZEN_WORKER_URL || "https://zen-api.djoumessi-michel08.workers.dev").replace(/\/$/, "");

async function relay(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (isDeviceProtectionEnabled() && !await verifyDeviceSession(request.cookies.get(DEVICE_COOKIE_NAME)?.value)) {
    return NextResponse.json({ detail: "Accès privé requis" }, { status: 401 });
  }
  const { path } = await context.params;
  const upstreamUrl = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}`, workerBaseUrl);
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (process.env.ZEN_WORKER_INTERNAL_SECRET) headers.set("x-zen-internal-secret", process.env.ZEN_WORKER_INTERNAL_SECRET);
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const upstream = await fetch(upstreamUrl, { method: request.method, headers, body, cache: "no-store" });
  return new NextResponse(upstream.body, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
export const PATCH = relay;
export const DELETE = relay;
