/**
 * Base for redirect URLs: the public site address (APP_URL) when set,
 * otherwise the request's own origin. Netlify can invoke a function under
 * its deploy-permalink host (123abc--site.netlify.app); building a
 * redirect from request.url would then move the browser onto that host,
 * where the login cookie doesn't exist and the address bar looks wrong.
 * Pinning to APP_URL keeps the session and the URL on the real site.
 */
export function canonicalBase(requestUrl: string): string {
  const raw = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : requestUrl;
}
