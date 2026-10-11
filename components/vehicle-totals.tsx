import { Money } from "@/components/money";
import { formatHours } from "@/lib/domain/costs";
import { cn } from "@/lib/utils";

export type Totals = {
  build: number;
  ownership: number;
  tools: number;
  recovered: number;
  unassigned: number;
  committed: number;
  paid: number;
  totalInvested: number;
  diyHours: number;
};

/** Spec cost rules 4 and 5: headline numbers, build with or without tools, recovered as its own line. */
export function VehicleTotals({
  totals,
  purchasePrice,
}: {
  totals: Totals;
  purchasePrice: number | null;
}) {
  const headline = [
    {
      label: "Total invested",
      value: totals.totalInvested,
      hint: purchasePrice
        ? "Purchase price + everything paid"
        : "Everything paid",
    },
    { label: "Build cost", value: totals.build, hint: `With tools: ` },
    {
      label: "Ownership cost",
      value: totals.ownership,
      hint: "Maintenance, repair, diagnosis",
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {headline.map((h) => (
          <div key={h.label} className="bg-muted/50 rounded-lg px-3 py-2">
            <dt className="text-muted-foreground text-xs">{h.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              <Money cents={h.value} />
            </dd>
            <dd className="text-muted-foreground text-xs">
              {h.label === "Build cost" ? (
                <>
                  With tools: <Money cents={totals.build + totals.tools} />
                </>
              ) : (
                h.hint
              )}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Line label="Tools" value={<Money cents={totals.tools} />} />
        <Line
          label="Recovered"
          value={<Money cents={-totals.recovered} />}
          className={cn(
            totals.recovered !== 0 && "text-emerald-700 dark:text-emerald-400",
          )}
        />
        {totals.unassigned !== 0 && (
          <Line
            label="Unassigned"
            value={<Money cents={totals.unassigned} />}
          />
        )}
        <Line
          label="Committed (not yet paid)"
          value={<Money cents={totals.committed} />}
        />
        {purchasePrice !== null && (
          <Line
            label="Purchase price"
            value={<Money cents={purchasePrice} />}
          />
        )}
        <Line label="DIY labor" value={formatHours(totals.diyHours)} />
      </dl>
    </div>
  );
}

function Line({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
