import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Embeddable popup snippet for the existing website (e.g. a Wix embed
 * block): `<script src="https://<app-domain>/embed.js" async></script>`.
 * Injects a dimmed overlay containing an iframe of /popup (full style
 * isolation from the host page). Auto-opens once after a short delay;
 * subsequent visits stay quiet once dismissed or subscribed. Any element
 * with the `data-cta-newsletter-open` attribute reopens it on click.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const js = `
(function () {
  var ORIGIN = ${JSON.stringify(origin)};
  var KEY = "cta-newsletter-dismissed";
  var AUTO_OPEN_DELAY = 4000;
  var overlay = null;

  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.documentElement.style.overflow = "";
  }

  function open() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.setAttribute("style",
      "position:fixed;inset:0;z-index:2147483647;background:rgba(30,30,29,0.55);" +
      "display:flex;align-items:center;justify-content:center;padding:20px;");
    var frame = document.createElement("iframe");
    frame.src = ORIGIN + "/popup";
    frame.title = "Sign up to the Alliance Newsletter";
    frame.setAttribute("style",
      "border:0;width:660px;max-width:100%;height:min(760px,96vh);background:transparent;");
    overlay.appendChild(frame);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { dismiss(); }
    });
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
  }

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    close();
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data) return;
    if (e.data.type === "cta-newsletter-close") dismiss();
    if (e.data.type === "cta-newsletter-subscribed") {
      try { localStorage.setItem(KEY, "1"); } catch (err) {}
    }
  });

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest &&
      e.target.closest("[data-cta-newsletter-open]");
    if (t) { e.preventDefault(); open(); }
  });

  var dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === "1"; } catch (e) {}
  if (!dismissed) {
    setTimeout(open, AUTO_OPEN_DELAY);
  }
})();
`;
  return new NextResponse(js, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
