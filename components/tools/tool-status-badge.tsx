import { Badge } from "@/components/ui/badge";
import { TOOL_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type ToolStatus = keyof typeof TOOL_STATUS_LABELS;

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        status === "need_to_buy"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "bg-muted text-neutral-700 dark:text-neutral-300",
      )}
    >
      {TOOL_STATUS_LABELS[status]}
    </Badge>
  );
}
