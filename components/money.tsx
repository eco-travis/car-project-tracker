import { formatCents } from "@/lib/domain/money";

/** Cents -> "$1,234.56". Renders nothing for null. */
export function Money({
  cents,
  className,
}: {
  cents: number | null | undefined;
  className?: string;
}) {
  if (cents === null || cents === undefined) return null;
  return (
    <span className={className ?? "tabular-nums"}>{formatCents(cents)}</span>
  );
}
