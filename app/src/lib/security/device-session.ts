const encoder = new TextEncoder();

export const DEVICE_COOKIE_NAME = "zen_device";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function config() {
  const signingSecret = process.env.ZEN_DEVICE_SIGNING_SECRET;
  const enrollmentCode = process.env.ZEN_ENROLLMENT_CODE;
  return { signingSecret, enrollmentCode, enabled: Boolean(signingSecret && enrollmentCode) };
}

export function isDeviceProtectionEnabled(): boolean {
  return config().enabled;
}

export async function createDeviceSession(): Promise<string> {
  const { signingSecret } = config();
  if (!signingSecret) throw new Error("ZEN_DEVICE_SIGNING_SECRET manquant");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const nonce = base64Url(crypto.getRandomValues(new Uint8Array(18)));
  const value = `v1.${expiresAt}.${nonce}`;
  return `${value}.${await sign(value, signingSecret)}`;
}

export async function verifyDeviceSession(value: string | undefined): Promise<boolean> {
  const { signingSecret, enabled } = config();
  if (!enabled) return true;
  if (!value || !signingSecret) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const signed = parts.slice(0, 3).join(".");
  return parts[3] === await sign(signed, signingSecret);
}

export async function verifyEnrollmentCode(value: unknown): Promise<boolean> {
  const { enrollmentCode, enabled } = config();
  if (!enabled || typeof value !== "string" || !enrollmentCode) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(value)),
    crypto.subtle.digest("SHA-256", encoder.encode(enrollmentCode)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export const deviceSessionMaxAge = SESSION_MAX_AGE_SECONDS;
