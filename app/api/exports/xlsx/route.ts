import { todayIso } from "@/lib/domain/dates";
import { fileResponse, routeSession, unauthorized } from "@/lib/exports/auth";
import { buildWorkbook } from "@/lib/exports/files";

export async function GET() {
  const session = await routeSession();
  if (!session) return unauthorized();
  const buffer = await buildWorkbook(session.supabase);
  return fileResponse(
    buffer,
    `cayenne-tracker-${todayIso()}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
