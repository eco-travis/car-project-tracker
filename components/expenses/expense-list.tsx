"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteExpense, markExpensePaid } from "@/lib/actions/expenses";
import type { ExpenseRow } from "@/lib/db/queries/expenses";
import type { LinkOptions } from "@/lib/db/queries/options";
import { formatDate } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ExpenseFormDialog } from "./expense-form-dialog";

/** Ledger rows with Mark paid (flow 3), edit, and delete. `hide` drops link columns that are implied by the page. */
export function ExpenseList({
  expenses,
  options,
  today,
  hide = [],
  emptyText = "No expenses yet.",
}: {
  expenses: ExpenseRow[];
  options: LinkOptions;
  today: string;
  hide?: ("job" | "part" | "tool" | "phase")[];
  emptyText?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
    });
  };

  if (!expenses.length)
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <ul className="divide-y rounded-lg border" aria-label="Expenses">
        {expenses.map((e) => {
          const links = [
            !hide.includes("job") &&
              e.job && { href: `/jobs/${e.job.id}`, label: e.job.title },
            !hide.includes("part") &&
              e.part && { href: `/parts/${e.part.id}`, label: e.part.name },
            !hide.includes("tool") &&
              e.tool && { href: "/tools", label: e.tool.name },
            !hide.includes("phase") &&
              !e.job &&
              e.phase && { href: "/plan", label: e.phase.name },
          ].filter(Boolean) as { href: string; label: string }[];
          const label = `${EXPENSE_CATEGORY_LABELS[e.category]}${e.vendor ? ` · ${e.vendor}` : ""}`;
          return (
            <li key={e.id} className="flex items-start gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDate(e.spent_on)}
                </p>
                <p className="break-words">{label}</p>
                {(links.length > 0 || e.notes) && (
                  <p className="text-muted-foreground text-xs break-words">
                    {links.map((l, i) => (
                      <span key={l.href + l.label}>
                        {i > 0 && " · "}
                        <Link href={l.href} className="hover:underline">
                          {l.label}
                        </Link>
                      </span>
                    ))}
                    {e.notes && `${links.length ? " · " : ""}${e.notes}`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Money
                  cents={e.amount_cents}
                  className={cn(
                    "font-medium tabular-nums",
                    e.amount_cents < 0 &&
                      "text-emerald-700 dark:text-emerald-400",
                  )}
                />
                <div className="flex items-center gap-1">
                  {e.state === "committed" ? (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() => run(() => markExpensePaid(e.id))}
                      aria-label={`Mark ${label} paid`}
                    >
                      Mark paid
                    </Button>
                  ) : (
                    <Badge variant="outline">Paid</Badge>
                  )}
                  {e.category !== "sale" && (
                    <ExpenseFormDialog
                      expense={e}
                      options={options}
                      today={today}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Edit ${label}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                      }
                    />
                  )}
                  <ConfirmButton
                    title="Delete expense"
                    description={`Delete this ${label} entry for ${formatDate(e.spent_on)}? Totals update right away.`}
                    confirmLabel="Delete expense"
                    onConfirm={() => deleteExpense(e.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${label}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    }
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
