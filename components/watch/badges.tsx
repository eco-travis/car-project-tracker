import { Badge } from "@/components/ui/badge";
import type { WatchSeverity, WatchStatus } from "@/lib/domain/watch";
import { WATCH_SEVERITY_LABELS, WATCH_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: WatchSeverity }) {
  const tone = {
    monitor: "bg-muted text-muted-foreground",
    concerning:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    act_soon: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  }[severity];
  return (
    <Badge variant="secondary" className={cn("border-transparent", tone)}>
      {WATCH_SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function DueBadge({ due, overdue }: { due: boolean; overdue: boolean }) {
  if (!due) return null;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        overdue ? "bg-red-600 text-white" : "bg-amber-500 text-white",
      )}
    >
      {overdue ? "Overdue" : "Due"}
    </Badge>
  );
}

export function WatchStatusBadge({ status }: { status: WatchStatus }) {
  return <Badge variant="outline">{WATCH_STATUS_LABELS[status]}</Badge>;
}
