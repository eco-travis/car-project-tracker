import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/domain/types";
import { JOB_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const tone: Record<JobStatus, string> = {
  not_started: "bg-muted text-neutral-700 dark:text-neutral-300",
  waiting_on_parts:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ready: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  in_progress:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  done: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-muted text-neutral-700 dark:text-neutral-300 line-through",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", tone[status])}
    >
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}
