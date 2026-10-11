"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import type { LinkOptions } from "@/lib/db/queries/options";
import { centsToInput } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_STATE_LABELS } from "@/lib/labels";
import {
  LEDGER_CATEGORIES,
  expenseSchema,
  type ExpenseFormValues,
  type ExpenseInput,
} from "@/lib/schemas/expense";

export type EditableExpense = {
  id: string;
  spent_on: string;
  amount_cents: number;
  category: string;
  state: "committed" | "paid";
  vendor: string | null;
  notes: string | null;
  job_id: string | null;
  phase_id: string | null;
  part_id: string | null;
  tool_id: string | null;
};

type Props = {
  expense?: EditableExpense;
  /** Pre-filled values for a new expense (links, category, vendor, state). */
  preset?: Partial<ExpenseFormValues>;
  options: LinkOptions;
  today: string;
  trigger: ReactNode;
  title?: string;
};

const toOptions = (xs: { id: string; name: string }[]) =>
  xs.map((x) => ({ value: x.id, label: x.name }));

export function ExpenseFormDialog({
  expense,
  preset,
  options,
  today,
  trigger,
  title,
}: Props) {
  const [open, setOpen] = useState(false);
  const defaults: ExpenseFormValues = expense
    ? {
        spent_on: expense.spent_on,
        amount_cents: centsToInput(expense.amount_cents),
        category: expense.category as ExpenseFormValues["category"],
        state: expense.state,
        vendor: expense.vendor ?? "",
        notes: expense.notes ?? "",
        job_id: expense.job_id ?? "",
        phase_id: expense.phase_id ?? "",
        part_id: expense.part_id ?? "",
        tool_id: expense.tool_id ?? "",
      }
    : {
        spent_on: today,
        amount_cents: "",
        category: "" as ExpenseFormValues["category"],
        state: "paid",
        vendor: "",
        notes: "",
        job_id: "",
        phase_id: "",
        part_id: "",
        tool_id: "",
        ...preset,
      };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<ExpenseFormValues, unknown, ExpenseInput>({
      resolver: zodResolver(expenseSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = expense
      ? await updateExpense(expense.id, getValues())
      : await createExpense(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setOpen(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title ?? (expense ? "Edit expense" : "Add expense")}
          </DialogTitle>
          <DialogDescription>
            Use a negative amount for a refund.
          </DialogDescription>
        </DialogHeader>
        <form
          id="expense-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="expense-amount"
            label="Amount ($)"
            inputMode="decimal"
            error={errors.amount_cents?.message}
            {...register("amount_cents")}
          />
          <TextField
            id="expense-date"
            label="Date"
            type="date"
            error={errors.spent_on?.message}
            {...register("spent_on")}
          />
          <SelectField
            id="expense-category"
            label="Category"
            emptyLabel="Choose…"
            options={LEDGER_CATEGORIES.map((c) => ({
              value: c,
              label: EXPENSE_CATEGORY_LABELS[c],
            }))}
            error={errors.category?.message}
            {...register("category")}
          />
          <SelectField
            id="expense-state"
            label="State"
            options={(["committed", "paid"] as const).map((s) => ({
              value: s,
              label: EXPENSE_STATE_LABELS[s],
            }))}
            hint="Committed = ordered, not yet paid."
            error={errors.state?.message}
            {...register("state")}
          />
          <TextField
            id="expense-vendor"
            label="Vendor"
            className="sm:col-span-2"
            error={errors.vendor?.message}
            {...register("vendor")}
          />
          <SelectField
            id="expense-job"
            label="Job"
            emptyLabel="None"
            options={toOptions(options.jobs)}
            error={errors.job_id?.message}
            {...register("job_id")}
          />
          <SelectField
            id="expense-phase"
            label="Phase"
            emptyLabel="None"
            hint="Only used when there's no job."
            options={toOptions(options.phases)}
            error={errors.phase_id?.message}
            {...register("phase_id")}
          />
          <SelectField
            id="expense-part"
            label="Part"
            emptyLabel="None"
            options={toOptions(options.parts)}
            error={errors.part_id?.message}
            {...register("part_id")}
          />
          <SelectField
            id="expense-tool"
            label="Tool"
            emptyLabel="None"
            options={toOptions(options.tools)}
            error={errors.tool_id?.message}
            {...register("tool_id")}
          />
          <TextareaField
            id="expense-notes"
            label="Notes"
            rows={2}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : expense
                ? "Save expense"
                : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
