"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { controlClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { addDependency, removeDependency } from "@/lib/actions/jobs";
import type { JobSummary } from "@/lib/db/queries/jobs";
import type { TaskStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { JobStatusBadge } from "./status-badge";

export function DependenciesPanel({
  jobId,
  blockedBy,
  blocks,
  blockingTasks,
  candidates,
}: {
  jobId: string;
  blockedBy: JobSummary[];
  blocks: JobSummary[];
  blockingTasks: { id: string; title: string; status: TaskStatus }[];
  candidates: JobSummary[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else after?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium">Blocked by</h3>
        {blockedBy.length === 0 && blockingTasks.length === 0 ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Nothing. This job can start any time.
          </p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border">
            {blockedBy.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <Link
                  href={`/jobs/${b.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {b.title}
                </Link>
                <JobStatusBadge status={b.status} />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove blocker ${b.title}`}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      removeDependency({
                        job_id: jobId,
                        blocked_by_job_id: b.id,
                      }),
                    )
                  }
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
            {blockingTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">Task: {t.title}</span>
                <span className="text-muted-foreground text-xs">
                  {t.status === "open"
                    ? "Open"
                    : t.status === "done"
                      ? "Done"
                      : "Dropped"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {candidates.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected) return setError("Pick a job.");
            run(
              () =>
                addDependency({ job_id: jobId, blocked_by_job_id: selected }),
              () => setSelected(""),
            );
          }}
        >
          <div className="flex min-w-48 flex-1 flex-col gap-2">
            <label htmlFor="add-blocker" className="text-sm font-medium">
              Add a blocking job
            </label>
            <select
              id="add-blocker"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className={cn(controlClass, "h-8")}
            >
              <option value="">Choose a job…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            Add blocker
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {blocks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Blocks</h3>
          <ul className="mt-1 flex flex-wrap gap-2 text-sm">
            {blocks.map((b) => (
              <li key={b.id}>
                <Link href={`/jobs/${b.id}`} className="underline">
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
