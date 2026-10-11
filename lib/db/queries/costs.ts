import "server-only";
import { createClient } from "@/lib/db/server";
import type { CostSummary } from "@/lib/domain/costs";

type CostRow = {
  budget_cents: number | null;
  committed_cents: number | null;
  paid_cents: number | null;
  remaining_cents: number | null;
};

/** View row -> the CostSummary shape the UI renders (rule 12 overage derived from remaining). */
export function toSummary(
  row: CostRow | undefined,
  budget: number | null = null,
): CostSummary {
  const remaining = row ? row.remaining_cents : budget;
  return {
    budget: row ? row.budget_cents : budget,
    committed: row?.committed_cents ?? 0,
    paid: row?.paid_cents ?? 0,
    remaining,
    overage: remaining !== null && remaining < 0 ? -remaining : null,
  };
}

export async function getVehicleTotals(vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_vehicle_totals")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();
  if (error) throw error;
  return {
    build: data?.build_cents ?? 0,
    ownership: data?.ownership_cents ?? 0,
    tools: data?.tools_cents ?? 0,
    recovered: data?.recovered_cents ?? 0,
    unassigned: data?.unassigned_cents ?? 0,
    committed: data?.committed_cents ?? 0,
    paid: data?.paid_cents ?? 0,
    totalInvested: data?.total_invested_cents ?? 0,
    diyHours: Number(data?.diy_hours ?? 0),
  };
}
