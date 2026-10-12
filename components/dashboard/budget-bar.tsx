import { Money } from "@/components/money";
import type { CostSummary } from "@/lib/domain/costs";
import { budgetBar } from "@/lib/domain/dashboard";
import { formatCents } from "@/lib/domain/money";

/** Paid / committed against budget, with the overage called out (rule 12). */
export function BudgetBarView({
  costs,
  label,
}: {
  costs: CostSummary;
  label: string;
}) {
  const bar = budgetBar(costs);
  const description =
    costs.budget === null
      ? `No budget set. Paid ${formatCents(costs.paid)}, committed ${formatCents(costs.committed)}.`
      : `${bar.usedPct}% of budget used`;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${label}: ${description}`}
        className="bg-muted flex h-3 w-full overflow-hidden rounded-full"
      >
        <span className="bg-foreground" style={{ width: `${bar.paidPct}%` }} />
        <span
          className="bg-foreground/40"
          style={{ width: `${bar.committedPct}%` }}
        />
        {bar.overPct > 0 && (
          <span
            className="bg-destructive"
            style={{ width: `${bar.overPct}%` }}
          />
        )}
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="bg-foreground size-2 rounded-full" aria-hidden />
          <dt className="text-muted-foreground">Paid</dt>
          <dd>
            <Money cents={costs.paid} />
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-foreground/40 size-2 rounded-full" aria-hidden />
          <dt className="text-muted-foreground">Committed</dt>
          <dd>
            <Money cents={costs.committed} />
          </dd>
        </div>
        {costs.budget !== null && (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Budget</dt>
            <dd>
              <Money cents={costs.budget} />
            </dd>
          </div>
        )}
        {costs.overage !== null ? (
          <div className="text-destructive flex gap-1 font-medium">
            <dt>Over by</dt>
            <dd>
              <Money cents={costs.overage} />
            </dd>
          </div>
        ) : (
          costs.remaining !== null && (
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Remaining</dt>
              <dd>
                <Money cents={costs.remaining} />
              </dd>
            </div>
          )
        )}
      </dl>
    </div>
  );
}
