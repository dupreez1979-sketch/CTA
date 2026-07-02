import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

export const dynamic = "force-dynamic";

/**
 * Serves re-hosted post images from Netlify Blobs (emails embed these
 * URLs). Immutable cache headers let Netlify's CDN absorb the traffic.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const store = getStore("post-images");
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const contentType =
    (entry.metadata?.contentType as string | undefined) ?? "image/jpeg";
  return new NextResponse(entry.data, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "netlify-cdn-cache-control": "public, max-age=31536000, immutable",
    },
  });
}
