import { NextResponse, type NextRequest } from "next/server";
import { EXPORT_TABLES } from "@/lib/domain/exports";

/** The CSV form submits ?table=…; forward to /api/exports/csv/<table>. */
export function GET(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table") ?? "";
  if (!(EXPORT_TABLES as readonly string[]).includes(table))
    return Response.json({ error: "Unknown table." }, { status: 404 });
  return NextResponse.redirect(
    new URL(`/api/exports/csv/${table}`, request.url),
  );
}
