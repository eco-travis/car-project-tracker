import "server-only";
import type { createClient } from "@/lib/db/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type LinkTable = "jobs" | "phases" | "parts" | "tools" | "watch_items";

/**
 * True when every given id is a row the user can read (RLS) on this vehicle.
 * Client-sent ids are never trusted; FK checks alone would accept another owner's ids.
 */
export async function linksBelongToVehicle(
  supabase: Supabase,
  vehicleId: string,
  links: Partial<Record<LinkTable, string | null>>,
): Promise<string | null> {
  for (const [table, id] of Object.entries(links) as [
    LinkTable,
    string | null,
  ][]) {
    if (!id) continue;
    let query = supabase.from(table).select("id").eq("id", id);
    // Tools can move between vehicles (vehicle_id nullable); RLS still limits them to the owner.
    if (table !== "tools") query = query.eq("vehicle_id", vehicleId);
    const { data } = await query.maybeSingle();
    if (!data)
      return table === "watch_items"
        ? "watch_item_id"
        : table.replace(/s$/, "_id");
  }
  return null;
}
