import { Badge } from "@/components/ui/badge";
import type { PartStatus } from "@/lib/domain/types";
import { PART_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const tone: Record<PartStatus, string> = {
  idea: "bg-muted text-neutral-700 dark:text-neutral-300",
  researching: "bg-muted text-neutral-700 dark:text-neutral-300",
  wishlist: "bg-muted text-neutral-700 dark:text-neutral-300",
  ordered: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  received: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  installed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  removed:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  sold: "bg-muted text-neutral-700 dark:text-neutral-300",
  returned: "bg-muted text-neutral-700 dark:text-neutral-300",
};

export function PartStatusBadge({ status }: { status: PartStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", tone[status])}
    >
      {PART_STATUS_LABELS[status]}
    </Badge>
  );
}
