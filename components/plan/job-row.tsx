import Link from "next/link";
import { Lock } from "lucide-react";
import { CostSummary, hasCosts } from "@/components/cost-summary";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import type { PlanJob } from "@/lib/db/queries/plan";
import { JOB_TYPE_LABELS } from "@/lib/labels";

/** Blockers only matter while the job is still open. */
export function visibleBlockers(job: PlanJob) {
  return job.status === "done" || job.status === "cancelled"
    ? []
    : job.blockers;
}

export function JobRow({ job }: { job: PlanJob }) {
  const blockers = visibleBlockers(job);
  return (
    <li className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
          {job.title}
        </Link>
        <p className="text-muted-foreground text-xs">
          {JOB_TYPE_LABELS[job.type]}
        </p>
        {blockers.length > 0 && (
          <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>
              Blocked by{" "}
              {blockers.map((b, i) => (
                <span key={`${b.kind}-${b.id}`}>
                  {i > 0 && ", "}
                  {b.kind === "job" ? (
                    <Link href={`/jobs/${b.id}`} className="underline">
                      {b.title}
                    </Link>
                  ) : (
                    <>task: {b.title}</>
                  )}
                </span>
              ))}
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <JobStatusBadge status={job.status} />
        {hasCosts(job.costs) && (
          <CostSummary costs={job.costs} compact className="sm:justify-end" />
        )}
      </div>
    </li>
  );
}
