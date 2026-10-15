import { describe, expect, it } from "vitest";
import {
  manualOdometerError,
  odometerAfterReading,
} from "@/lib/domain/odometer";

describe("odometerAfterReading (rule 14)", () => {
  it("raises the odometer to a higher reading", () => {
    expect(odometerAfterReading(141000, 141250)).toBe(141250);
  });

  it("never lowers it", () => {
    expect(odometerAfterReading(141000, 120000)).toBe(141000);
  });

  it("ignores a missing reading", () => {
    expect(odometerAfterReading(141000, null)).toBe(141000);
  });
});

describe("manualOdometerError", () => {
  it("accepts any whole number, lower than before included (corrections)", () => {
    expect(manualOdometerError(141500)).toBeNull();
    expect(manualOdometerError(140999)).toBeNull();
    expect(manualOdometerError(0)).toBeNull();
  });

  it("rejects non-integers and negatives", () => {
    expect(manualOdometerError(-1)).toBe("Enter a whole number of miles.");
    expect(manualOdometerError(1.5)).toBe("Enter a whole number of miles.");
  });
});
