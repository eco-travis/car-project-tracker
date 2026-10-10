import { describe, expect, it } from "vitest";
import {
  phaseDeleteConfirmation,
  reorderIds,
  seedPhaseNames,
} from "@/lib/domain/phases";

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

describe("phaseDeleteConfirmation (rule 22)", () => {
  it("names the job count that will become unphased", () => {
    expect(phaseDeleteConfirmation("Armor and recovery", 3)).toBe(
      'Delete "Armor and recovery"? Its 3 jobs will stay in the plan as unphased.',
    );
    expect(phaseDeleteConfirmation("Armor and recovery", 1)).toBe(
      'Delete "Armor and recovery"? Its 1 job will stay in the plan as unphased.',
    );
    expect(phaseDeleteConfirmation("Empty", 0)).toBe(
      'Delete "Empty"? It has no jobs.',
    );
  });
});

describe("reorderIds", () => {
  it("moves an id to a new position", () => {
    expect(reorderIds(["a", "b", "c", "d"], 0, 2)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(reorderIds(["a", "b", "c", "d"], 3, 0)).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
  });

  it("returns the input for an out-of-range source", () => {
    expect(reorderIds(["a"], 5, 0)).toEqual(["a"]);
  });
});
