import { describe, expect, it } from "vitest";
import {
  allTags,
  jobFromInspiration,
  matchesTag,
  normalizeTags,
  overwriteConfirmation,
  partFromInspiration,
} from "@/lib/domain/inspiration";

const card = {
  title: "Rival skid plate set",
  source_url: "https://forum.example/thread/123",
  notes: "Looks bombproof",
  promoted_part_id: null,
  promoted_job_id: null,
};

describe("tags", () => {
  it("normalizes comma-separated tags", () => {
    expect(normalizeTags(" Armor, armor ,Sleep  System,, ")).toEqual([
      "armor",
      "sleep system",
    ]);
  });

  it("lists and filters by tag", () => {
    const items = [
      { tags: ["lighting", "armor"] },
      { tags: ["armor"] },
      { tags: [] },
    ];
    expect(allTags(items)).toEqual(["armor", "lighting"]);
    expect(items.filter((i) => matchesTag(i, "lighting"))).toHaveLength(1);
    expect(items.filter((i) => matchesTag(i, undefined))).toHaveLength(3);
  });
});

describe("promote (rule 19)", () => {
  it("creates a Wishlist part from the card", () => {
    expect(partFromInspiration(card)).toEqual({
      name: "Rival skid plate set",
      status: "wishlist",
      product_url: "https://forum.example/thread/123",
      notes: "Looks bombproof",
    });
  });

  it("creates a Not started job in the chosen phase", () => {
    expect(
      jobFromInspiration(card, { phase_id: "ph", type: "modification" }),
    ).toEqual({
      title: "Rival skid plate set",
      type: "modification",
      status: "not_started",
      phase_id: "ph",
      description: "Looks bombproof",
      links: ["https://forum.example/thread/123"],
    });
    expect(
      jobFromInspiration(
        { ...card, source_url: null },
        { phase_id: null, type: "modification" },
      ).links,
    ).toEqual([]);
  });

  it("asks for confirmation only when overwriting an existing link of that kind", () => {
    expect(overwriteConfirmation(card, "part")).toBeNull();
    expect(
      overwriteConfirmation({ ...card, promoted_part_id: "p" }, "part"),
    ).toMatch(/already links to a part/);
    expect(
      overwriteConfirmation({ ...card, promoted_part_id: "p" }, "job"),
    ).toBeNull();
  });
});
