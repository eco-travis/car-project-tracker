import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/domain/money";

describe("formatCents", () => {
  it("formats positive, zero, and negative cents as USD", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-4999)).toBe("-$49.99");
  });

  it("rejects non-integer input", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });
});
