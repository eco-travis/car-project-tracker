import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/domain/money";

describe("formatCents", () => {
  it("formats positive, zero, and negative cents as USD", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-4999)).toBe("-$49.99");
  });

  it("never renders negative zero", () => {
    expect(formatCents(-0)).toBe("$0.00");
  });

  it("rejects non-integer input", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });
});

describe("parseDollarsToCents", () => {
  it.each([
    ["1234.56", 123456],
    ["$1,234.5", 123450],
    ["80", 8000],
    [" 0.07 ", 7],
    [".5", 50],
    ["-20", -2000],
    ["-0", 0],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents);
  });

  it("returns null for blank input", () => {
    expect(parseDollarsToCents("   ")).toBeNull();
  });

  it.each(["abc", "1.234", "1..2", "12-3", "1e5"])(
    "returns NaN for %j",
    (input) => {
      expect(parseDollarsToCents(input)).toBeNaN();
    },
  );
});
