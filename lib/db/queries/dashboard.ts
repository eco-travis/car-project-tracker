import "server-only";
import { createClient } from "@/lib/db/server";
import { activePhase } from "@/lib/domain/dashboard";
import { todayIso } from "@/lib/domain/dates";
import { addInterval } from "@/lib/domain/watch";
import { getVehicleTotals, toSummary } from "./costs";
import { getLatestHighlight } from "./media";

/** Everything the dashboard shows, fetched in parallel. */
export async function getDashboard(vehicleId: string) {
  const supabase = await createClient();
  const today = todayIso();
  const [
    totals,
    phases,
    phaseCosts,
    jobs,
    parts,
    watch,
    due,
    tasks,
    highlight,
  ] = await Promise.all([
    getVehicleTotals(vehicleId),
    supabase
      .from("phases")
      .select("id, name, status, budget_cents")
      .order("sort_order"),
    supabase.from("v_phase_costs").select("*"),
    supabase
      .from("jobs")
      .select("id, title, status, phase:phases(name)")
      .in("status", ["ready", "waiting_on_parts"])
      .order("sort_order"),
    supabase
      .from("parts")
      .select("id, name, brand, vendor, return_by, job:jobs(id, title)")
      .eq("status", "ordered")
      .order("name"),
    supabase
      .from("watch_items")
      .select("id, title, severity, next_followup_on, next_followup_odometer")
      .eq("status", "watching"),
    supabase.from("v_watch_due").select("watch_item_id, is_due, is_overdue"),
    supabase
      .from("tasks")
      .select("id, title, due_on")
      .eq("status", "open")
      .not("due_on", "is", null)
      .lte("due_on", addInterval(today, 7, "days"))
      .order("due_on"),
    getLatestHighlight(),
  ]);
  for (const r of [phases, phaseCosts, jobs, parts, watch, due, tasks])
    if (r.error) throw r.error;

  const active = activePhase(phases.data!);
  const dueById = new Map(due.data!.map((d) => [d.watch_item_id, d]));
  const watchDue = watch
    .data!.map((w) => ({
      ...w,
      is_due: !!dueById.get(w.id)?.is_due,
      is_overdue: !!dueById.get(w.id)?.is_overdue,
    }))
    .filter((w) => w.is_due)
    .sort(
      (a, b) =>
        Number(b.is_overdue) - Number(a.is_overdue) ||
        a.title.localeCompare(b.title),
    );

  return {
    today,
    totals,
    activePhase: active
      ? {
          ...active,
          costs: toSummary(
            phaseCosts.data!.find((c) => c.phase_id === active.id),
            active.budget_cents,
          ),
        }
      : null,
    ready: jobs.data!.filter((j) => j.status === "ready"),
    waiting: jobs.data!.filter((j) => j.status === "waiting_on_parts"),
    arriving: parts.data!,
    watchDue,
    tasksDueSoon: tasks.data!,
    highlight,
  };
}
