import { describe, expect, it } from "vitest";
import {
  addInterval,
  closeWatchItem,
  partsToCarryOver,
  resolveFollowup,
  sortWatchList,
  watchDue,
  type DueInput,
} from "@/lib/domain/watch";

const today = "2026-10-11";

describe("addInterval", () => {
  it("adds days, weeks, and months", () => {
    expect(addInterval("2026-10-11", 10, "days")).toBe("2026-10-21");
    expect(addInterval("2026-10-11", 2, "weeks")).toBe("2026-10-25");
    expect(addInterval("2026-10-11", 3, "months")).toBe("2027-01-11");
    expect(addInterval("2026-10-11", -7, "days")).toBe("2026-10-04");
  });

  it("clamps to the end of shorter months", () => {
    expect(addInterval("2026-01-31", 1, "months")).toBe("2026-02-28");
    expect(addInterval("2028-01-31", 1, "months")).toBe("2028-02-29");
  });
});

describe("resolveFollowup (rule 16)", () => {
  const none = {
    in_amount: null,
    in_unit: null,
    on: null,
    in_miles: null,
    at_odometer: null,
  };

  it("converts 'in 3 months' and 'in 3,000 miles' to absolute values", () => {
    expect(
      resolveFollowup(
        { ...none, in_amount: 3, in_unit: "months", in_miles: 3000 },
        today,
        141250,
      ),
    ).toEqual({
      next_followup_on: "2027-01-11",
      next_followup_odometer: 144250,
    });
  });

  it("keeps absolute values as given, preferring them over relative ones", () => {
    expect(
      resolveFollowup(
        {
          ...none,
          on: "2026-12-01",
          in_amount: 3,
          in_unit: "months",
          at_odometer: 150000,
          in_miles: 5,
        },
        today,
        1,
      ),
    ).toEqual({
      next_followup_on: "2026-12-01",
      next_followup_odometer: 150000,
    });
  });

  it("allows either, both, or neither", () => {
    expect(resolveFollowup(none, today, 1)).toEqual({
      next_followup_on: null,
      next_followup_odometer: null,
    });
    expect(resolveFollowup({ ...none, in_miles: 500 }, today, 1000)).toEqual({
      next_followup_on: null,
      next_followup_odometer: 1500,
    });
  });
});

describe("watchDue (rule 15 + 500-mile decision)", () => {
  const item = (o: Partial<DueInput>): DueInput => ({
    status: "watching",
    next_followup_on: null,
    next_followup_odometer: null,
    ...o,
  });

  it("is never due with neither field set", () => {
    expect(watchDue(item({}), today, 999999)).toEqual({
      due: false,
      overdue: false,
    });
  });

  it("is due on or after the date, overdue more than 7 days after", () => {
    expect(
      watchDue(item({ next_followup_on: "2026-10-12" }), today, 0),
    ).toEqual({ due: false, overdue: false });
    expect(watchDue(item({ next_followup_on: today }), today, 0)).toEqual({
      due: true,
      overdue: false,
    });
    expect(
      watchDue(item({ next_followup_on: "2026-10-04" }), today, 0),
    ).toEqual({ due: true, overdue: false }); // exactly 7 days
    expect(
      watchDue(item({ next_followup_on: "2026-10-03" }), today, 0),
    ).toEqual({ due: true, overdue: true });
  });

  it("is due at the reading, overdue more than 500 miles past it", () => {
    expect(
      watchDue(item({ next_followup_odometer: 141251 }), today, 141250),
    ).toEqual({ due: false, overdue: false });
    expect(
      watchDue(item({ next_followup_odometer: 141250 }), today, 141250),
    ).toEqual({ due: true, overdue: false });
    expect(
      watchDue(item({ next_followup_odometer: 140750 }), today, 141250),
    ).toEqual({ due: true, overdue: false }); // exactly 500
    expect(
      watchDue(item({ next_followup_odometer: 140749 }), today, 141250),
    ).toEqual({ due: true, overdue: true });
  });

  it("is due at whichever comes first", () => {
    expect(
      watchDue(
        item({
          next_followup_on: "2027-01-01",
          next_followup_odometer: 141000,
        }),
        today,
        141250,
      ).due,
    ).toBe(true);
  });

  it("only applies to watching items", () => {
    for (const status of ["promoted", "resolved", "dismissed"] as const) {
      expect(
        watchDue(item({ status, next_followup_on: "2020-01-01" }), today, 0),
      ).toEqual({ due: false, overdue: false });
    }
  });
});

describe("sortWatchList", () => {
  it("puts overdue first, then due, then by date (undated last), then severity", () => {
    const items = [
      {
        title: "Undated",
        severity: "act_soon",
        status: "watching",
        next_followup_on: null,
        next_followup_odometer: null,
      },
      {
        title: "Later",
        severity: "monitor",
        status: "watching",
        next_followup_on: "2026-12-01",
        next_followup_odometer: null,
      },
      {
        title: "Due",
        severity: "monitor",
        status: "watching",
        next_followup_on: "2026-10-10",
        next_followup_odometer: null,
      },
      {
        title: "Overdue",
        severity: "monitor",
        status: "watching",
        next_followup_on: "2026-09-01",
        next_followup_odometer: null,
      },
      {
        title: "Sooner",
        severity: "concerning",
        status: "watching",
        next_followup_on: "2026-11-01",
        next_followup_odometer: null,
      },
    ] as const;
    expect(sortWatchList([...items], today, 0).map((i) => i.title)).toEqual([
      "Overdue",
      "Due",
      "Sooner",
      "Later",
      "Undated",
    ]);
  });
});

describe("promote and close (rules 17 and 18)", () => {
  it("carries over only suspected parts without a job", () => {
    expect(
      partsToCarryOver([
        { id: "a", job_id: null },
        { id: "b", job_id: "j" },
      ]).map((p) => p.id),
    ).toEqual(["a"]);
  });

  it("sets status and closed_on", () => {
    expect(closeWatchItem("resolved", today)).toEqual({
      status: "resolved",
      closed_on: today,
    });
    expect(closeWatchItem("dismissed", today)).toEqual({
      status: "dismissed",
      closed_on: today,
    });
  });
});
