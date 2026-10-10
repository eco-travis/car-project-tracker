import { describe, expect, it } from "vitest";
import {
  completionDefaults,
  completionErrors,
  openBlockers,
  partsToOfferInstall,
  statusChangeError,
  wouldCreateCycle,
  type OpenBlocker,
} from "@/lib/domain/jobs";
import type { JobStatus } from "@/lib/domain/types";

describe("openBlockers (rule 1)", () => {
  it("counts blocking jobs that aren't done or cancelled", () => {
    const jobs = (
      [
        "not_started",
        "waiting_on_parts",
        "ready",
        "in_progress",
        "done",
        "cancelled",
      ] as JobStatus[]
    ).map((status, i) => ({ id: `j${i}`, title: status, status }));
    expect(openBlockers(jobs, []).map((b) => b.title)).toEqual([
      "not_started",
      "waiting_on_parts",
      "ready",
      "in_progress",
    ]);
  });

  it("counts only open tasks linked with blocks_job", () => {
    const tasks = [
      {
        id: "t1",
        title: "Book bay",
        status: "open" as const,
        blocks_job: true,
      },
      {
        id: "t2",
        title: "Done errand",
        status: "done" as const,
        blocks_job: true,
      },
      {
        id: "t3",
        title: "Dropped",
        status: "dropped" as const,
        blocks_job: true,
      },
      {
        id: "t4",
        title: "Just linked",
        status: "open" as const,
        blocks_job: false,
      },
    ];
    expect(openBlockers([], tasks)).toEqual([
      { kind: "task", id: "t1", title: "Book bay" },
    ]);
  });
});

describe("statusChangeError (rule 2)", () => {
  const blockers: OpenBlocker[] = [
    { kind: "job", id: "a", title: "Order lift kit" },
    { kind: "task", id: "b", title: "Book bay" },
  ];

  it.each(["ready", "in_progress", "done"] as JobStatus[])(
    "blocks moving to %s and names the blockers",
    (target) => {
      expect(statusChangeError(target, blockers)).toBe(
        'Blocked by "Order lift kit" and task "Book bay". Finish or remove them first.',
      );
    },
  );

  it.each(["not_started", "waiting_on_parts", "cancelled"] as JobStatus[])(
    "allows %s even when blocked",
    (target) => {
      expect(statusChangeError(target, blockers)).toBeNull();
    },
  );

  it("allows any status with no open blockers", () => {
    expect(statusChangeError("done", [])).toBeNull();
  });

  it("uses singular wording for one blocker", () => {
    expect(statusChangeError("ready", [blockers[0]])).toBe(
      'Blocked by "Order lift kit". Finish or remove it first.',
    );
  });
});

describe("completion (rule 3)", () => {
  it("requires a date and an odometer reading", () => {
    expect(
      completionErrors({ completed_on: null, completed_odometer: null }),
    ).toEqual({
      completed_on: "Enter the date the job was finished.",
      completed_odometer: "Enter the odometer reading.",
    });
    expect(
      completionErrors({ completed_on: "2026-10-10", completed_odometer: 0 }),
    ).toEqual({});
  });

  it("pre-fills today and the current odometer", () => {
    expect(completionDefaults("2026-10-10", 141250)).toEqual({
      completed_on: "2026-10-10",
      completed_odometer: 141250,
    });
  });
});

describe("partsToOfferInstall (rule 4)", () => {
  it("offers only received parts", () => {
    const parts = [
      { id: "1", status: "received" as const },
      { id: "2", status: "ordered" as const },
      { id: "3", status: "installed" as const },
      { id: "4", status: "received" as const },
    ];
    expect(partsToOfferInstall(parts).map((p) => p.id)).toEqual(["1", "4"]);
  });
});

describe("wouldCreateCycle (rule 5)", () => {
  // B is blocked by A; C is blocked by B.
  const edges = [
    { job_id: "B", blocked_by_job_id: "A" },
    { job_id: "C", blocked_by_job_id: "B" },
  ];

  it("rejects a job blocking itself", () => {
    expect(wouldCreateCycle(edges, "A", "A")).toBe(true);
  });

  it("rejects a direct cycle", () => {
    expect(wouldCreateCycle(edges, "A", "B")).toBe(true);
  });

  it("rejects a transitive cycle", () => {
    expect(wouldCreateCycle(edges, "A", "C")).toBe(true);
  });

  it("allows edges that keep the graph acyclic", () => {
    expect(wouldCreateCycle(edges, "C", "A")).toBe(false);
    expect(wouldCreateCycle(edges, "D", "C")).toBe(false);
  });

  it("terminates on diamond-shaped graphs", () => {
    const diamond = [
      { job_id: "B", blocked_by_job_id: "A" },
      { job_id: "C", blocked_by_job_id: "A" },
      { job_id: "D", blocked_by_job_id: "B" },
      { job_id: "D", blocked_by_job_id: "C" },
    ];
    expect(wouldCreateCycle(diamond, "A", "D")).toBe(true);
    expect(wouldCreateCycle(diamond, "E", "D")).toBe(false);
  });
});
