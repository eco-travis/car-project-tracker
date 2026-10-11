import { Money } from "@/components/money";
import type { CostSummary as Summary } from "@/lib/domain/costs";
import { cn } from "@/lib/utils";

/** Budget · Committed · Paid · Remaining (or the overage, rule 12). */
export function CostSummary({
  costs,
  compact = false,
  className,
}: {
  costs: Summary;
  compact?: boolean;
  className?: string;
}) {
  const items: { label: string; value: React.ReactNode; tone?: string }[] = [];
  if (costs.budget !== null)
    items.push({ label: "Budget", value: <Money cents={costs.budget} /> });
  items.push({ label: "Committed", value: <Money cents={costs.committed} /> });
  items.push({ label: "Paid", value: <Money cents={costs.paid} /> });
  if (costs.overage !== null) {
    items.push({
      label: "Over by",
      value: <Money cents={costs.overage} />,
      tone: "text-destructive font-medium",
    });
  } else if (costs.remaining !== null) {
    items.push({
      label: "Remaining",
      value: <Money cents={costs.remaining} />,
    });
  }

  if (compact) {
    return (
      <dl
        className={cn(
          "text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs",
          className,
        )}
      >
        {items.map((i) => (
          <div key={i.label} className={cn("flex gap-1", i.tone)}>
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {items.map((i) => (
        <div key={i.label} className="bg-muted/50 rounded-lg px-3 py-2">
          <dt className="text-muted-foreground text-xs">{i.label}</dt>
          <dd className={cn("text-lg font-semibold tabular-nums", i.tone)}>
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** True when there's anything worth showing for a job row. */
export function hasCosts(c: Summary): boolean {
  return c.budget !== null || c.committed !== 0 || c.paid !== 0;
}
