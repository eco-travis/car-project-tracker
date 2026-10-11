import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  costSummary,
  effectiveJobId,
  effectivePhaseId,
  expenseBucket,
  vehicleTotals,
  type JobRef,
  type PartRef,
} from "@/lib/domain/costs";
import { seedPhaseNames } from "@/lib/domain/phases";
import type { Database } from "@/lib/db/types";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

let user: TestUser;
let vehicleId: string;
let phaseA: string; // has a modification job
let phaseB: string; // phase-only spend
const ids: Record<string, string> = {};

async function insert<T extends keyof Database["public"]["Tables"]>(
  table: T,
  values: Record<string, unknown>,
) {
  const { data, error } = await user.client
    .from(table)
    .insert(values as never)
    .select("*")
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data as unknown as { id: string } & Record<string, unknown>;
}

beforeAll(async () => {
  user = await createTestUser("money");
  const { data, error } = await user.client.rpc("create_vehicle_with_phases", {
    p_name: "Money test",
    p_phase_names: seedPhaseNames(),
    p_purchase_price_cents: 1250000,
  });
  if (error) throw error;
  vehicleId = data;
  const { data: phases } = await user.client
    .from("phases")
    .select("id")
    .order("sort_order");
  [phaseA, phaseB] = [phases![0].id, phases![1].id];
  await user.client
    .from("phases")
    .update({ budget_cents: 100000 })
    .eq("id", phaseA);
  await user.client
    .from("phases")
    .update({ budget_cents: 5000 })
    .eq("id", phaseB);

  ids.mod = (
    await insert("jobs", {
      vehicle_id: vehicleId,
      phase_id: phaseA,
      title: "Lift",
      type: "modification",
      budget_cents: 90000,
      diy_hours: 3.5,
    })
  ).id;
  ids.oil = (
    await insert("jobs", {
      vehicle_id: vehicleId,
      title: "Oil",
      type: "maintenance",
      diy_hours: 1.25,
    })
  ).id;
  ids.lift = (
    await insert("parts", {
      vehicle_id: vehicleId,
      job_id: ids.mod,
      name: "Spacers",
      status: "installed",
    })
  ).id;
  ids.stock = (
    await insert("parts", {
      vehicle_id: vehicleId,
      job_id: ids.mod,
      name: "Stock springs",
      status: "removed",
    })
  ).id;
  ids.loose = (
    await insert("parts", {
      vehicle_id: vehicleId,
      name: "Unassigned part",
      status: "ordered",
    })
  ).id;
  ids.tool = (
    await insert("tools", {
      vehicle_id: vehicleId,
      name: "Triple-square socket",
    })
  ).id;

  const e = (o: Record<string, unknown>) =>
    insert("expenses", {
      vehicle_id: vehicleId,
      spent_on: "2026-10-01",
      category: "part",
      ...o,
    });
  await e({ amount_cents: 80000, part_id: ids.lift }); // part-only -> Lift job, build, phase A
  await e({
    amount_cents: 12000,
    job_id: ids.mod,
    category: "shop_labor_bay",
    state: "committed",
  }); // committed, Lift
  await e({
    amount_cents: 9000,
    job_id: ids.oil,
    category: "fluids_consumables",
  }); // ownership, no phase
  await e({ amount_cents: 15000, tool_id: ids.tool, category: "tool" }); // tools
  await e({ amount_cents: 4000, phase_id: phaseB, category: "other" }); // build, phase B only
  await e({
    amount_cents: 2500,
    phase_id: phaseB,
    category: "shipping_tax_fees",
    state: "committed",
  }); // committed, phase B
  await e({ amount_cents: 700, part_id: ids.loose }); // unassigned
  await e({ amount_cents: -1500, job_id: ids.oil, category: "other" }); // refund -> recovered
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

async function domainInputs() {
  const [{ data: expenses }, { data: jobs }, { data: parts }] =
    await Promise.all([
      user.client.from("expenses").select("*"),
      user.client
        .from("jobs")
        .select("id, type, phase_id, diy_hours, budget_cents"),
      user.client.from("parts").select("id, job_id"),
    ]);
  return {
    expenses: expenses as Expense[],
    jobs: new Map(
      jobs!.map((j) => [
        j.id,
        j as JobRef & { budget_cents: number | null; diy_hours: number | null },
      ]),
    ),
    parts: new Map(parts!.map((p) => [p.id, p as PartRef])),
  };
}

describe("v_expense_attribution (rules 10 and 11)", () => {
  it("matches the domain's effective job, phase, and bucket for every expense", async () => {
    const { expenses, jobs, parts } = await domainInputs();
    const { data: rows } = await user.client
      .from("v_expense_attribution")
      .select("id, effective_job_id, effective_phase_id, bucket");
    expect(rows).toHaveLength(expenses.length);
    for (const e of expenses) {
      const jobId = effectiveJobId(e, parts);
      const job = jobId ? jobs.get(jobId) : undefined;
      expect(
        rows!.find((r) => r.id === e.id),
        `expense ${e.amount_cents}`,
      ).toEqual({
        id: e.id,
        effective_job_id: jobId,
        effective_phase_id: effectivePhaseId(e, job),
        bucket: expenseBucket(e, job),
      });
    }
  });
});

describe("v_job_costs (rules 9, 10, 12)", () => {
  it("matches costSummary for each job, counting part-only expenses toward the part's job", async () => {
    const { expenses, jobs, parts } = await domainInputs();
    const { data: rows } = await user.client.from("v_job_costs").select("*");
    for (const [id, job] of jobs) {
      const s = costSummary(
        job.budget_cents,
        expenses.filter((e) => effectiveJobId(e, parts) === id),
      );
      expect(rows!.find((r) => r.job_id === id)).toEqual({
        job_id: id,
        budget_cents: s.budget,
        committed_cents: s.committed,
        paid_cents: s.paid,
        remaining_cents: s.remaining,
      });
    }
    // Known fixture values for the Lift job: 80,000 paid via its part, 12,000 committed, 90,000 budget.
    expect(rows!.find((r) => r.job_id === ids.mod)).toMatchObject({
      committed_cents: 12000,
      paid_cents: 80000,
      remaining_cents: -2000,
    });
  });
});

describe("v_phase_costs (rules 9, 10, 13)", () => {
  it("rolls up by effective phase with summed DIY hours", async () => {
    const { data: rows } = await user.client
      .from("v_phase_costs")
      .select("*")
      .in("phase_id", [phaseA, phaseB]);
    const byId = Object.fromEntries(rows!.map((r) => [r.phase_id, r]));
    expect(byId[phaseA]).toMatchObject({
      budget_cents: 100000,
      committed_cents: 12000,
      paid_cents: 80000,
      remaining_cents: 8000,
      diy_hours: 3.5,
    });
    expect(byId[phaseB]).toMatchObject({
      budget_cents: 5000,
      committed_cents: 2500,
      paid_cents: 4000,
      remaining_cents: -1500,
      diy_hours: 0,
    });
  });
});

describe("v_vehicle_totals (rule 11)", () => {
  it("matches vehicleTotals and the known fixture values", async () => {
    const { expenses, jobs, parts } = await domainInputs();
    const t = vehicleTotals(1250000, expenses, jobs, parts);
    const { data: row } = await user.client
      .from("v_vehicle_totals")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .single();
    expect(row).toEqual({
      vehicle_id: vehicleId,
      build_cents: t.build,
      ownership_cents: t.ownership,
      tools_cents: t.tools,
      recovered_cents: t.recovered,
      unassigned_cents: t.unassigned,
      committed_cents: t.committed,
      paid_cents: t.paid,
      total_invested_cents: t.totalInvested,
      diy_hours: 4.75,
    });
    expect(t).toMatchObject({
      build: 84000,
      ownership: 9000,
      tools: 15000,
      recovered: -1500,
      unassigned: 700,
      committed: 14500,
    });
    expect(t.totalInvested).toBe(1250000 + 107200);
  });
});

describe("expenses_mark_part_ordered trigger (rule 6)", () => {
  it.each(["idea", "researching", "wishlist"])(
    "moves a %s part to ordered",
    async (status) => {
      const part = await insert("parts", {
        vehicle_id: vehicleId,
        name: `Part ${status}`,
        status,
      });
      await insert("expenses", {
        vehicle_id: vehicleId,
        spent_on: "2026-10-02",
        amount_cents: 100,
        category: "part",
        state: "committed",
        part_id: part.id,
      });
      const { data } = await user.client
        .from("parts")
        .select("status")
        .eq("id", part.id)
        .single();
      expect(data!.status).toBe("ordered");
    },
  );

  it("leaves later statuses alone (rule 8)", async () => {
    const part = await insert("parts", {
      vehicle_id: vehicleId,
      name: "Already installed",
      status: "installed",
    });
    await insert("expenses", {
      vehicle_id: vehicleId,
      spent_on: "2026-10-02",
      amount_cents: 100,
      category: "part",
      part_id: part.id,
    });
    const { data } = await user.client
      .from("parts")
      .select("status")
      .eq("id", part.id)
      .single();
    expect(data!.status).toBe("installed");
  });
});

describe("record_part_sale (rule 7)", () => {
  it("creates a negative paid sale expense and marks the part sold", async () => {
    const { data: expenseId, error } = await user.client.rpc(
      "record_part_sale",
      {
        p_part_id: ids.stock,
        p_price_cents: 25000,
        p_spent_on: "2026-10-03",
        p_vendor: "Forum buyer",
      },
    );
    expect(error).toBeNull();
    const { data: expense } = await user.client
      .from("expenses")
      .select("*")
      .eq("id", expenseId!)
      .single();
    expect(expense).toMatchObject({
      amount_cents: -25000,
      category: "sale",
      state: "paid",
      part_id: ids.stock,
      vendor: "Forum buyer",
    });
    const { data: part } = await user.client
      .from("parts")
      .select("status")
      .eq("id", ids.stock)
      .single();
    expect(part!.status).toBe("sold");
    const { data: costs } = await user.client
      .from("v_part_costs")
      .select("sold_cents")
      .eq("part_id", ids.stock)
      .single();
    expect(costs!.sold_cents).toBe(25000);
  });

  it("refuses a part that isn't removed, writing nothing", async () => {
    const { count: before } = await user.client
      .from("expenses")
      .select("*", { count: "exact", head: true });
    const { error } = await user.client.rpc("record_part_sale", {
      p_part_id: ids.lift,
      p_price_cents: 100,
      p_spent_on: "2026-10-03",
    });
    expect(error?.message).toMatch(/Removed/);
    const { count: after } = await user.client
      .from("expenses")
      .select("*", { count: "exact", head: true });
    expect(after).toBe(before);
  });
});
