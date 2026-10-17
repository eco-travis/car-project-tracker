import { describe, expect, it } from "vitest";
import {
  installedOnFor,
  partStatusAfterExpense,
  partsNotOrdered,
  recordSaleError,
  saleExpense,
} from "@/lib/domain/parts";
import type { PartStatus } from "@/lib/domain/types";

const ALL: PartStatus[] = [
  "idea",
  "researching",
  "wishlist",
  "ordered",
  "received",
  "installed",
  "removed",
  "sold",
  "returned",
];

describe("partStatusAfterExpense (rule 6)", () => {
  it.each(["idea", "researching", "wishlist"] as PartStatus[])(
    "moves %s to ordered",
    (s) => {
      expect(partStatusAfterExpense(s)).toBe("ordered");
    },
  );

  it("leaves every later status alone (rule 8: other changes are manual)", () => {
    for (const s of ALL.slice(3)) expect(partStatusAfterExpense(s)).toBe(s);
  });
});

describe("record sale (rule 7)", () => {
  it("is allowed only for removed parts", () => {
    expect(recordSaleError("removed")).toBeNull();
    for (const s of ALL.filter((s) => s !== "removed"))
      expect(recordSaleError(s)).toMatch(/Removed/);
  });

  it("creates a negative, paid sale expense", () => {
    expect(saleExpense(25000)).toEqual({
      category: "sale",
      state: "paid",
      amount_cents: -25000,
    });
  });

  it("rejects a zero, negative, or fractional price", () => {
    expect(() => saleExpense(0)).toThrow(RangeError);
    expect(() => saleExpense(-5)).toThrow(RangeError);
    expect(() => saleExpense(1.5)).toThrow(RangeError);
  });
});

describe("partsNotOrdered", () => {
  it("lists parts still in planning", () => {
    const parts = ALL.map((status, i) => ({ id: String(i), status }));
    expect(partsNotOrdered(parts).map((p) => p.status)).toEqual([
      "idea",
      "researching",
      "wishlist",
    ]);
  });
});

describe("installedOnFor", () => {
  it("dates an Installed part with the fallback when no date was given", () => {
    expect(installedOnFor("installed", null, "2026-10-16")).toBe("2026-10-16");
  });
  it("keeps a date the user entered", () => {
    expect(installedOnFor("installed", "2026-09-30", "2026-10-16")).toBe(
      "2026-09-30",
    );
    expect(installedOnFor("removed", "2026-09-30", "2026-10-16")).toBe(
      "2026-09-30",
    );
  });
  it("leaves other statuses undated", () => {
    expect(installedOnFor("received", null, "2026-10-16")).toBeNull();
  });
});
