import "server-only";
import { createClient } from "@/lib/db/server";
import { EXPENSE_SELECT } from "./expenses";

export async function getParts() {
  const supabase = await createClient();
  const [parts, costs] = await Promise.all([
    supabase.from("parts").select("*, job:jobs(id, title)").order("name"),
    supabase.from("v_part_costs").select("part_id, spent_cents, sold_cents"),
  ]);
  if (parts.error) throw parts.error;
  if (costs.error) throw costs.error;
  const byPart = new Map(costs.data.map((c) => [c.part_id, c]));
  return parts.data.map((p) => ({
    ...p,
    spent_cents: byPart.get(p.id)?.spent_cents ?? 0,
    sold_cents: byPart.get(p.id)?.sold_cents ?? 0,
  }));
}

export type PartListRow = Awaited<ReturnType<typeof getParts>>[number];

/** Case-insensitive match on name, brand, vendor, and every part number including superseded ones. */
export function matchesPartSearch(p: PartListRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    p.name,
    p.brand,
    p.vendor,
    p.oem_part_number,
    p.aftermarket_part_number,
    ...p.superseded_numbers,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  // Part numbers are often written with or without spaces/dashes.
  const squash = (s: string) => s.replace(/[\s-]/g, "");
  return haystack.includes(needle) || squash(haystack).includes(squash(needle));
}

export async function getPart(id: string) {
  const supabase = await createClient();
  const { data: part, error } = await supabase
    .from("parts")
    .select("*, job:jobs(id, title)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!part) return null;
  const [replaces, replacedBy, expenses, costs] = await Promise.all([
    part.replaces_part_id
      ? supabase
          .from("parts")
          .select("id, name")
          .eq("id", part.replaces_part_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("parts").select("id, name").eq("replaces_part_id", id),
    supabase
      .from("expenses")
      .select(EXPENSE_SELECT)
      .eq("part_id", id)
      .order("spent_on", { ascending: false }),
    supabase
      .from("v_part_costs")
      .select("spent_cents, sold_cents")
      .eq("part_id", id)
      .maybeSingle(),
  ]);
  if (replacedBy.error) throw replacedBy.error;
  if (expenses.error) throw expenses.error;
  return {
    part: {
      ...part,
      replaces: replaces.data as { id: string; name: string } | null,
    },
    replacedBy: replacedBy.data,
    expenses: expenses.data,
    spent: costs.data?.spent_cents ?? 0,
    sold: costs.data?.sold_cents ?? 0,
  };
}
