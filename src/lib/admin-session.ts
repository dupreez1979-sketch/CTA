/**
 * Cookie session for the admin area, replacing HTTP Basic auth (and its
 * unbrandable browser prompt). The session cookie holds an HMAC derived
 * from ADMIN_PASSWORD: logging in with the right password sets it,
 * changing the password invalidates every existing session. Web Crypto
 * only, so the same code runs in edge middleware and node routes.
 */

export const ADMIN_COOKIE = "cta_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function adminSessionToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("cta-newsletter-admin-session-v1"),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
