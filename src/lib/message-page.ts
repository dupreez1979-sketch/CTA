import { COLORS, FONT_DISPLAY, FONT_BODY, SHADOW } from "./tokens";

/**
 * A small branded page for standalone messages: preview empty states,
 * "not configured" responses — anywhere a route needs to talk to a human
 * outside the app shell. Pure string template (no React, no fonts to
 * load) so it is safe in the edge middleware too.
 */
export function messagePageHtml(
  title: string,
  body: string,
  opts?: { backHref?: string; backLabel?: string },
): string {
  const back = opts?.backHref
    ? `<a href="${opts.backHref}" style="display:inline-block;margin-top:22px;font-family:${FONT_BODY};font-weight:700;font-size:14px;color:${COLORS.ink};background:${COLORS.yellow};border:2px solid ${COLORS.ink};border-radius:999px;box-shadow:${SHADOW.sm};padding:10px 22px;text-decoration:none">${opts.backLabel ?? "Back to admin"}</a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · The Children's Theatre Alliance</title>
</head>
<body style="margin:0;min-height:100vh;background:${COLORS.cream};display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box">
<main style="max-width:520px;width:100%;background:${COLORS.creamWarm};border:3px solid ${COLORS.ink};border-radius:18px;box-shadow:${SHADOW.lg};padding:36px 34px 34px">
<span style="display:inline-block;background:${COLORS.teal};color:${COLORS.ink};font-family:${FONT_BODY};font-weight:700;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border:2px solid ${COLORS.ink};border-radius:999px;box-shadow:${SHADOW.sm}">The Children's Theatre Alliance</span>
<h1 style="font-family:${FONT_DISPLAY};font-weight:400;font-size:34px;line-height:0.98;letter-spacing:0.01em;text-transform:uppercase;color:${COLORS.ink};margin:22px 0 12px">${title}</h1>
<p style="font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${COLORS.textBody};margin:0">${body}</p>
${back}
</main>
</body>
</html>`;
}
