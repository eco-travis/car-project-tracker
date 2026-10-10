import { describe, expect, it } from "vitest";
import { seedPhaseNames } from "@/lib/domain/phases";

describe("seedPhaseNames (rule 21)", () => {
  it("returns the five starter phases in order", () => {
    expect(seedPhaseNames()).toEqual([
      "Baseline maintenance",
      "Suspension and tires",
      "Armor and recovery",
      "Electrical and lighting",
      "Sleep and storage",
    ]);
  });

  it("returns a fresh array each call", () => {
    const a = seedPhaseNames();
    a.pop();
    expect(seedPhaseNames()).toHaveLength(5);
  });
});
