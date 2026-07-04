import { NextResponse } from "next/server";
import { db, subscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin: export the full subscriber list as CSV. */
export async function GET() {
  const rows = await db().select().from(subscribers);
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const csv = [
    "first_name,last_name,email,cadence,showcase_edition,status,created_at",
    ...rows.map((r) =>
      [
        esc(r.firstName),
        esc(r.lastName),
        esc(r.email),
        r.cadence,
        r.showcase ? "yes" : "no",
        r.status,
        r.createdAt.toISOString(),
      ].join(","),
    ),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="subscribers.csv"',
    },
  });
}
