import { describe, expect, it } from "vitest";
import {
  dueWithin,
  reopenTask,
  sortOpenTasks,
  taskLinkError,
  taskStatusUpdate,
} from "@/lib/domain/tasks";

const today = "2026-10-11";

describe("task status (rule 20)", () => {
  it("done records the completion date; dropped doesn't", () => {
    expect(taskStatusUpdate("done", today)).toEqual({
      status: "done",
      completed_on: today,
    });
    expect(taskStatusUpdate("dropped", today)).toEqual({
      status: "dropped",
      completed_on: null,
    });
    expect(reopenTask()).toEqual({ status: "open", completed_on: null });
  });

  it("returns only task fields: nothing else is touched", () => {
    expect(Object.keys(taskStatusUpdate("done", today)).sort()).toEqual([
      "completed_on",
      "status",
    ]);
  });
});

describe("taskLinkError", () => {
  const link = {
    job_id: null,
    part_id: null,
    phase_id: null,
    watch_item_id: null,
    blocks_job: false,
  };
  it("needs exactly one target, and only job links can block", () => {
    expect(taskLinkError({ ...link, job_id: "j" })).toBeNull();
    expect(
      taskLinkError({ ...link, job_id: "j", blocks_job: true }),
    ).toBeNull();
    expect(taskLinkError(link)).toMatch(/exactly one/);
    expect(taskLinkError({ ...link, job_id: "j", part_id: "p" })).toMatch(
      /exactly one/,
    );
    expect(taskLinkError({ ...link, part_id: "p", blocks_job: true })).toBe(
      "Only a job link can block.",
    );
  });
});

describe("ordering and due soon", () => {
  it("sorts open tasks by due date with undated last", () => {
    const tasks = [
      { title: "B undated", due_on: null },
      { title: "Later", due_on: "2026-11-01" },
      { title: "A undated", due_on: null },
      { title: "Soon", due_on: "2026-10-12" },
    ];
    expect(sortOpenTasks(tasks).map((t) => t.title)).toEqual([
      "Soon",
      "Later",
      "A undated",
      "B undated",
    ]);
  });

  it("finds open tasks due within 7 days, including overdue", () => {
    const tasks = [
      { id: 1, status: "open" as const, due_on: "2026-10-01" },
      { id: 2, status: "open" as const, due_on: "2026-10-18" },
      { id: 3, status: "open" as const, due_on: "2026-10-19" },
      { id: 4, status: "done" as const, due_on: "2026-10-12" },
      { id: 5, status: "open" as const, due_on: null },
    ];
    expect(dueWithin(tasks, today).map((t) => t.id)).toEqual([1, 2]);
  });
});
