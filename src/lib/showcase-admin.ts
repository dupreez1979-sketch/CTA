/**
 * Shared redirect builder for The Showcase admin routes: every action
 * bounces back to the tab, preserving the builder context (edition id)
 * and any story-pool filters carried through the form as hidden inputs.
 */
export function showcaseRedirectUrl(
  requestUrl: string,
  form: FormData,
  message: string,
  opts?: { edition?: number | null },
): URL {
  const params = new URLSearchParams({ tab: "presenters" });
  let edition: number | null = null;
  if (opts && "edition" in opts) {
    edition = opts.edition ?? null;
  } else {
    const raw = Number(form.get("edition"));
    edition = Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (edition) params.set("edition", String(edition));
  for (const key of ["rel", "co", "q", "sort", "dir", "pg"] as const) {
    const v = form.get(key);
    if (typeof v === "string" && v) params.set(key, v);
  }
  params.set("message", message);
  // A hidden "anchor" input sends the browser back to the section the
  // action came from instead of the top of the page.
  const anchor = form.get("anchor");
  const hash =
    typeof anchor === "string" && /^[a-z][a-z0-9-]*$/.test(anchor)
      ? `#${anchor}`
      : "";
  return new URL(`/admin?${params.toString()}${hash}`, requestUrl);
}
