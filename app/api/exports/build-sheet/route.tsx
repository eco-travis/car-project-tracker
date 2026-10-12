import { renderToBuffer } from "@react-pdf/renderer";
import { todayIso } from "@/lib/domain/dates";
import { fileResponse, routeSession, unauthorized } from "@/lib/exports/auth";
import { loadBuildSheet } from "@/lib/exports/data";
import { BuildSheetPdf } from "@/lib/exports/pdf/build-sheet";
import { parsePdfOptions } from "@/lib/schemas/exports";

export async function GET(request: Request) {
  const session = await routeSession();
  if (!session) return unauthorized();
  const o = parsePdfOptions(new URL(request.url));
  const data = await loadBuildSheet(session.supabase, session.vehicle, o, {
    costs: o.costs,
  });
  const pdf = await renderToBuffer(<BuildSheetPdf data={data} />);
  return fileResponse(
    new Uint8Array(pdf),
    `build-sheet-${todayIso()}.pdf`,
    "application/pdf",
  );
}
