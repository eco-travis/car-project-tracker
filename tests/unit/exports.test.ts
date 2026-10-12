import { describe, expect, it } from "vitest";
import {
  buildSheetGroups,
  centsToDollars,
  csvCell,
  exportHeader,
  exportValue,
  pickJobPhoto,
  receiptThumbnailsDecision,
  serviceHistoryJobs,
} from "@/lib/domain/exports";

const none = { from: null, to: null, phase: null };
const job = (o: Record<string, unknown>) =>
  ({
    title: "J",
    status: "done",
    type: "maintenance",
    completed_on: "2026-05-01",
    completed_odometer: 1000,
    phase_id: null,
    ...o,
  }) as {
    title: string;
    status: string;
    type: "maintenance" | "repair" | "diagnosis" | "modification";
    completed_on: string | null;
    completed_odometer: number | null;
    phase_id: string | null;
  };

describe("serviceHistoryJobs", () => {
  it("keeps done maintenance, repair, and diagnosis jobs, newest first", () => {
    const jobs = [
      job({ title: "old", completed_on: "2026-01-01" }),
      job({ title: "mod", type: "modification" }),
      job({ title: "open", status: "in_progress" }),
      job({ title: "new", type: "repair", completed_on: "2026-09-01" }),
      job({ title: "diag", type: "diagnosis", completed_on: "2026-05-01" }),
    ];
    expect(serviceHistoryJobs(jobs, none).map((j) => j.title)).toEqual([
      "new",
      "diag",
      "old",
    ]);
  });

  it("applies the date range (inclusive) and phase", () => {
    const jobs = [
      job({ title: "a", completed_on: "2026-03-01", phase_id: "p" }),
      job({ title: "b", completed_on: "2026-04-01" }),
    ];
    expect(
      serviceHistoryJobs(jobs, {
        from: "2026-03-01",
        to: "2026-03-31",
        phase: null,
      }).map((j) => j.title),
    ).toEqual(["a"]);
    expect(
      serviceHistoryJobs(jobs, { ...none, phase: "p" }).map((j) => j.title),
    ).toEqual(["a"]);
  });
});

describe("buildSheetGroups", () => {
  it("groups done modifications by phase in plan order, unphased last", () => {
    const phases = [
      { id: "p1", name: "Suspension" },
      { id: "p2", name: "Armor" },
    ];
    const jobs = [
      job({ title: "skids", type: "modification", phase_id: "p2" }),
      job({ title: "lift", type: "modification", phase_id: "p1" }),
      job({ title: "rack", type: "modification" }),
      job({ title: "oil", type: "maintenance", phase_id: "p1" }),
    ];
    const groups = buildSheetGroups(jobs, phases, none);
    expect(
      groups.map((g) => [g.phase?.name ?? null, g.jobs.map((j) => j.title)]),
    ).toEqual([
      ["Suspension", ["lift"]],
      ["Armor", ["skids"]],
      [null, ["rack"]],
    ]);
  });
});

describe("pickJobPhoto", () => {
  const a = (o: Record<string, unknown>) =>
    ({
      kind: "photo",
      highlight: false,
      tag: null,
      taken_at: "2026-01-01",
      ...o,
    }) as {
      kind: string;
      highlight: boolean;
      tag: string | null;
      taken_at: string;
    };
  it("prefers the newest highlight, then the newest After photo", () => {
    expect(
      pickJobPhoto([
        a({ tag: "after", taken_at: "2026-02-01" }),
        a({ highlight: true, taken_at: "2026-01-15" }),
      ])?.taken_at,
    ).toBe("2026-01-15");
    expect(
      pickJobPhoto([
        a({ tag: "after", taken_at: "2026-02-01" }),
        a({ tag: "after", taken_at: "2026-03-01" }),
      ])?.taken_at,
    ).toBe("2026-03-01");
    expect(
      pickJobPhoto([
        a({ tag: "before" }),
        a({ kind: "receipt", highlight: true }),
      ]),
    ).toBeNull();
  });
});

describe("receiptThumbnailsDecision", () => {
  it("omits thumbnails above 200 entries and says so", () => {
    expect(receiptThumbnailsDecision(200, true)).toEqual({
      include: true,
      note: null,
    });
    expect(receiptThumbnailsDecision(201, true)).toEqual({
      include: false,
      note: "Receipt thumbnails omitted: more than 200 entries.",
    });
    expect(receiptThumbnailsDecision(5, false)).toEqual({
      include: false,
      note: null,
    });
  });
});

describe("spreadsheet values", () => {
  it("converts money to dollars and renames the column", () => {
    expect(centsToDollars(123456)).toBe(1234.56);
    expect(exportHeader("amount_cents")).toBe("amount_usd");
    expect(exportHeader("title")).toBe("title");
    expect(exportValue("budget_cents", 99)).toBe(0.99);
    expect(exportValue("links", ["a", "b"])).toBe("a; b");
    expect(exportValue("notes", null)).toBeNull();
  });

  it("escapes CSV cells and neutralizes formulas", () => {
    expect(csvCell("amount_cents", 100)).toBe("1.00");
    expect(csvCell("amount_cents", -2550)).toBe("-25.50");
    expect(csvCell("title", 'Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell("notes", "line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("title", "=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("title", null)).toBe("");
  });
});
