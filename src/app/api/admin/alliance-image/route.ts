import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore } from "@netlify/blobs";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// Netlify functions cap the request payload (~6 MB); keep a safe margin.
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Admin: upload an image for an Alliance update and store it on Netlify Blobs
 * (the same "post-images" store used for re-hosted feed images). Returns the
 * relative /api/img/<key> URL; the composer inserts it into the content as a
 * markdown image, and the sender absolutises it at render time. Behind the
 * admin basic-auth middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "That file is not an image" },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Please choose an image under 5 MB" },
        { status: 400 },
      );
    }
    const bytes = await file.arrayBuffer();
    const key = `alliance-${randomUUID()}`;
    const store = getStore("post-images");
    await store.set(key, bytes, { metadata: { contentType: file.type } });
    return NextResponse.json({ url: `/api/img/${key}` });
  } catch (err) {
    console.error("Alliance image upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
