import { getStore } from "@netlify/blobs";

/**
 * Re-host feed images. The Facebook image URLs in the rss.app feed are
 * signed and short-lived, so each post image is downloaded at ingest time
 * and copied to Netlify Blobs; emails embed a durable URL served by
 * /api/img/[key]. Returns null on any failure — the email template renders
 * a brand-coloured placeholder slot for items without an image.
 */
export async function rehostImage(
  sourceUrl: string,
  guid: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "CTA-Newsletter/1.0" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > 10 * 1024 * 1024) {
      return null;
    }
    const key = guid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const store = getStore("post-images");
    await store.set(key, buffer, { metadata: { contentType } });
    const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    return `${appUrl}/api/img/${key}`;
  } catch (err) {
    console.error(`Image re-host failed for ${guid}:`, err);
    return null;
  }
}
