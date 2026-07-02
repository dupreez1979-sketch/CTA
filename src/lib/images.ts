import { put } from "@vercel/blob";

/**
 * Re-host feed images. The Facebook image URLs in the rss.app feed are
 * signed and short-lived, so each post image is downloaded at ingest time
 * and copied to Vercel Blob; emails embed the durable Blob URL.
 * Returns null on any failure — the email template renders a brand-coloured
 * placeholder slot for items without an image.
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
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) return null;
    const ext = contentType.includes("png") ? "png" : "jpg";
    const key = `posts/${guid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}.${ext}`;
    const blob = await put(key, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  } catch {
    return null;
  }
}
