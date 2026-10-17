import { describe, expect, it } from "vitest";
import {
  costSummary,
  effectiveJobId,
  effectivePhaseId,
  expenseBucket,
  formatHours,
  totalDiyHours,
  purchaseCost,
  vehicleTotals,
  type AttributableExpense,
  type JobRef,
  type PartRef,
} from "@/lib/domain/costs";

const exp = (o: Partial<AttributableExpense> = {}): AttributableExpense => ({
  amount_cents: 1000,
  category: "part",
  job_id: null,
  phase_id: null,
  part_id: null,
  ...o,
});

describe("costSummary (rules 9 and 12)", () => {
  it("sums committed and paid separately, paid including negatives", () => {
    const s = costSummary(10000, [
      { amount_cents: 3000, state: "committed" },
      { amount_cents: 5000, state: "paid" },
      { amount_cents: -1000, state: "paid" },
    ]);
    expect(s).toEqual({
      budget: 10000,
      committed: 3000,
      paid: 4000,
      remaining: 3000,
      overage: null,
    });
  });

  it("shows no remaining without a budget", () => {
    expect(
      costSummary(null, [{ amount_cents: 500, state: "paid" }]),
    ).toMatchObject({ remaining: null, overage: null });
  });

  it("reports the overage in cents when over budget", () => {
    expect(
      costSummary(1000, [{ amount_cents: 1500, state: "paid" }]),
    ).toMatchObject({ remaining: -500, overage: 500 });
  });

  it("treats exactly on budget as no overage", () => {
    expect(
      costSummary(1000, [{ amount_cents: 1000, state: "committed" }]),
    ).toMatchObject({ remaining: 0, overage: null });
  });
});

describe("attribution (rule 10 and the part-only decision)", () => {
  const parts = new Map<string, PartRef>([["p1", { id: "p1", job_id: "j1" }]]);
  const job: JobRef = { id: "j1", type: "repair", phase_id: "ph1" };

  it("uses the expense's own job first", () => {
    expect(effectiveJobId(exp({ job_id: "j9", part_id: "p1" }), parts)).toBe(
      "j9",
    );
  });

  it("falls back to the part's job", () => {
    expect(effectiveJobId(exp({ part_id: "p1" }), parts)).toBe("j1");
  });

  it("uses the job's phase over the expense's own phase", () => {
    expect(effectivePhaseId(exp({ phase_id: "ph2" }), job)).toBe("ph1");
    expect(effectivePhaseId(exp({ phase_id: "ph2" }), undefined)).toBe("ph2");
  });
});

describe("expenseBucket (rule 11)", () => {
  const mod: JobRef = { id: "m", type: "modification", phase_id: null };
  const maint: JobRef = { id: "x", type: "maintenance", phase_id: null };

  it("puts tool purchases in tools, even on a job", () => {
    expect(expenseBucket(exp({ category: "tool" }), mod)).toBe("tools");
  });

  it("puts negative amounts in recovered", () => {
    expect(
      expenseBucket(exp({ amount_cents: -500, category: "sale" }), mod),
    ).toBe("recovered");
  });

  it("splits job costs into build (modification) and ownership (everything else)", () => {
    expect(expenseBucket(exp(), mod)).toBe("build");
    for (const type of ["maintenance", "repair", "diagnosis"] as const) {
      expect(expenseBucket(exp(), { ...maint, type })).toBe("ownership");
    }
  });

  it("counts phase-only expenses as build and anything else as unassigned", () => {
    expect(expenseBucket(exp({ phase_id: "ph" }), undefined)).toBe("build");
    expect(expenseBucket(exp(), undefined)).toBe("unassigned");
  });
});

describe("purchaseCost", () => {
  it("adds price, sales tax, and licensing; unset counts as zero", () => {
    expect(
      purchaseCost({
        purchase_price_cents: 1250000,
        purchase_tax_cents: 112500,
        purchase_fees_cents: 41800,
      }),
    ).toBe(1404300);
    expect(
      purchaseCost({
        purchase_price_cents: null,
        purchase_tax_cents: null,
        purchase_fees_cents: 41800,
      }),
    ).toBe(41800);
  });
});

describe("vehicleTotals (rule 11)", () => {
  it("buckets paid money, tracks committed separately, and adds the purchase price", () => {
    const jobs = new Map<string, JobRef>([
      ["mod", { id: "mod", type: "modification", phase_id: "ph" }],
      ["oil", { id: "oil", type: "maintenance", phase_id: null }],
    ]);
    const parts = new Map<string, PartRef>([
      ["lift", { id: "lift", job_id: "mod" }],
    ]);
    const t = vehicleTotals(
      1250000,
      [
        { ...exp({ amount_cents: 80000, part_id: "lift" }), state: "paid" }, // build via part's job
        { ...exp({ amount_cents: 9000, job_id: "oil" }), state: "paid" }, // ownership
        { ...exp({ amount_cents: 15000, category: "tool" }), state: "paid" }, // tools
        {
          ...exp({ amount_cents: -25000, category: "sale", part_id: "lift" }),
          state: "paid",
        }, // recovered
        { ...exp({ amount_cents: 4000, phase_id: "ph" }), state: "paid" }, // build, phase only
        { ...exp({ amount_cents: 700 }), state: "paid" }, // unassigned
        { ...exp({ amount_cents: 50000, job_id: "mod" }), state: "committed" },
      ],
      jobs,
      parts,
    );
    expect(t).toEqual({
      build: 84000,
      ownership: 9000,
      tools: 15000,
      recovered: -25000,
      unassigned: 700,
      committed: 50000,
      paid: 83700,
      totalInvested: 1333700,
    });
  });
});

describe("DIY hours (rule 13)", () => {
  it("sums hours, ignoring blanks, and formats as hours", () => {
    expect(
      totalDiyHours([
        { diy_hours: 1.5 },
        { diy_hours: null },
        { diy_hours: 2.25 },
      ]),
    ).toBe(3.75);
    expect(formatHours(3.75)).toBe("3.75 h");
  });
});
