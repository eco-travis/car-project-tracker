import { todayIso } from "@/lib/domain/dates";
import { EXPORT_TABLES, type ExportTable } from "@/lib/domain/exports";
import { fileResponse, routeSession, unauthorized } from "@/lib/exports/auth";
import { buildCsv } from "@/lib/exports/files";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/exports/csv/[entity]">,
) {
  const session = await routeSession();
  if (!session) return unauthorized();
  const { entity } = await params;
  if (!(EXPORT_TABLES as readonly string[]).includes(entity)) {
    return Response.json(
      { error: `Unknown table. Use one of: ${EXPORT_TABLES.join(", ")}` },
      { status: 404 },
    );
  }
  const csv = await buildCsv(session.supabase, entity as ExportTable);
  return fileResponse(
    new TextEncoder().encode(csv),
    `${entity}-${todayIso()}.csv`,
    "text/csv; charset=utf-8",
  );
}
