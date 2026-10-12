import { renderToBuffer } from "@react-pdf/renderer";
import { todayIso } from "@/lib/domain/dates";
import { fileResponse, routeSession, unauthorized } from "@/lib/exports/auth";
import { loadServiceHistory } from "@/lib/exports/data";
import { ServiceHistoryPdf } from "@/lib/exports/pdf/service-history";
import { parsePdfOptions } from "@/lib/schemas/exports";

export async function GET(request: Request) {
  const session = await routeSession();
  if (!session) return unauthorized();
  const o = parsePdfOptions(new URL(request.url));
  const data = await loadServiceHistory(session.supabase, session.vehicle, o, {
    costs: o.costs,
    receipts: o.receipts,
  });
  const pdf = await renderToBuffer(<ServiceHistoryPdf data={data} />);
  return fileResponse(
    new Uint8Array(pdf),
    `service-history-${todayIso()}.pdf`,
    "application/pdf",
  );
}
