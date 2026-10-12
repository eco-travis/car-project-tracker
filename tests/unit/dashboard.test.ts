import { describe, expect, it } from "vitest";
import { activePhase, budgetBar } from "@/lib/domain/dashboard";

const cost = (budget: number | null, committed: number, paid: number) => ({
  budget,
  committed,
  paid,
  remaining: budget === null ? null : budget - committed - paid,
  overage:
    budget !== null && committed + paid > budget
      ? committed + paid - budget
      : null,
});

describe("activePhase", () => {
  it("picks the first Active phase in plan order", () => {
    expect(
      activePhase([
        { id: "a", status: "done" },
        { id: "b", status: "active" },
        { id: "c", status: "active" },
      ] as const)?.id,
    ).toBe("b");
    expect(activePhase([{ id: "a", status: "planned" }] as const)).toBeNull();
  });
});

describe("budgetBar", () => {
  it("shows paid and committed as shares of the budget", () => {
    expect(budgetBar(cost(300000, 11200, 54500))).toEqual({
      paidPct: 18.2,
      committedPct: 3.7,
      overPct: 0,
      usedPct: 22,
    });
  });

  it("scales to total spend when over budget and shows the overage", () => {
    expect(budgetBar(cost(1000, 0, 1500))).toEqual({
      paidPct: 100,
      committedPct: 0,
      overPct: 33.3,
      usedPct: 150,
    });
  });

  it("has no percent used without a budget", () => {
    expect(budgetBar(cost(null, 100, 300))).toEqual({
      paidPct: 75,
      committedPct: 25,
      overPct: 0,
      usedPct: null,
    });
    expect(budgetBar(cost(null, 0, 0))).toEqual({
      paidPct: 0,
      committedPct: 0,
      overPct: 0,
      usedPct: null,
    });
  });

  it("ignores negative paid (refunds larger than spend) in the bar", () => {
    expect(budgetBar(cost(1000, 0, -200)).paidPct).toBe(0);
  });
});
