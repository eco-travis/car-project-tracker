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

describe("manualOdometerError (rule 14)", () => {
  it("accepts the current value or higher", () => {
    expect(manualOdometerError(141000, 141000)).toBeNull();
    expect(manualOdometerError(141000, 141500)).toBeNull();
  });

  it("rejects a lower value", () => {
    expect(manualOdometerError(141000, 140999)).toBe(
      "The odometer can't go down. It's at 141,000 miles.",
    );
  });

  it("rejects non-integers and negatives", () => {
    expect(manualOdometerError(0, -1)).toBe("Enter a whole number of miles.");
    expect(manualOdometerError(0, 1.5)).toBe("Enter a whole number of miles.");
  });
});
