"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/form/field";
import { setJobStatus } from "@/lib/actions/jobs";
import { statusChangeError, type OpenBlocker } from "@/lib/domain/jobs";
import type { JobStatus } from "@/lib/domain/types";
import { JOB_STATUS_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { CompletionDialog, type CompletionJob } from "./completion-dialog";

export function StatusControl({
  job,
  openBlockers,
  completionDefaults,
}: {
  job: CompletionJob & { status: JobStatus };
  openBlockers: OpenBlocker[];
  completionDefaults: { completed_on: string; completed_odometer: number };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [doneOpen, setDoneOpen] = useState(false);

  function change(status: JobStatus) {
    setError(null);
    // Rule 2 feedback without a round trip; the server action re-checks.
    const blocked = statusChangeError(status, openBlockers);
    if (blocked) return setError(blocked);
    if (status === "done") return setDoneOpen(true);
    startTransition(async () => {
      const result = await setJobStatus(job.id, { status });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="job-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="job-status"
            value={job.status}
            disabled={pending}
            onChange={(e) => change(e.target.value as JobStatus)}
            aria-describedby={error ? "job-status-error" : undefined}
            className={cn(controlClass, "h-8 w-48")}
          >
            {options(JOB_STATUS_LABELS).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {job.status !== "done" && (
          <Button onClick={() => change("done")}>
            <CheckCircle2 aria-hidden /> Mark done
          </Button>
        )}
      </div>
      {error && (
        <p
          id="job-status-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      )}
      {/* Mounted per opening so the form starts from fresh defaults. */}
      {doneOpen && (
        <CompletionDialog
          job={job}
          defaults={completionDefaults}
          open
          onOpenChange={setDoneOpen}
        />
      )}
    </div>
  );
}
