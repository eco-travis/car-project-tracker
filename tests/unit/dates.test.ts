import { describe, expect, it } from "vitest";
import { todayIso } from "@/lib/domain/dates";

describe("todayIso", () => {
  it("uses Pacific time, not UTC", () => {
    // 2026-10-10 03:00 UTC is still Oct 9 in Los Angeles (UTC-7).
    expect(todayIso(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-09");
    expect(todayIso(new Date("2026-10-10T08:00:00Z"))).toBe("2026-10-10");
  });
});
