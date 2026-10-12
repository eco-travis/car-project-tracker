"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { TextField } from "@/components/form/text-field";
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
import { completeTasks, recordSale } from "@/lib/actions/parts";
import {
  saleSchema,
  type SaleFormValues,
  type SaleInput,
} from "@/lib/schemas/expense";

/**
 * Flow 6: sell a Removed part, then offer to close open tasks linked to it (rule 7).
 * Stays mounted after the sale (the part becomes Sold) so the follow-up can show; only the
 * trigger depends on `available`.
 */
export function RecordSaleDialog({
  partId,
  partName,
  today,
  available,
  trigger,
}: {
  partId: string;
  partName: string;
  today: string;
  available: boolean;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [openTasks, setOpenTasks] = useState<
    { id: string; title: string }[] | null
  >(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const defaults: SaleFormValues = {
    price_cents: "",
    spent_on: today,
    vendor: "",
    notes: "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<SaleFormValues, unknown, SaleInput>({
      resolver: zodResolver(saleSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = await recordSale(partId, getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    if (result.data.openTasks.length) setOpenTasks(result.data.openTasks);
    else setOpen(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaults);
          setOpenTasks(null);
          setTaskError(null);
        }
      }}
    >
      {available && (
        <DialogTrigger asChild>
          <ClientTrigger>{trigger}</ClientTrigger>
        </DialogTrigger>
      )}
      <DialogContent>
        {openTasks ? (
          <>
            <DialogHeader>
              <DialogTitle>Sale recorded</DialogTitle>
              <DialogDescription>
                {openTasks.length === 1
                  ? "An open task is linked to this part. Mark it done?"
                  : `${openTasks.length} open tasks are linked to this part. Mark them done?`}
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc pl-5 text-sm">
              {openTasks.map((t) => (
                <li key={t.id}>{t.title}</li>
              ))}
            </ul>
            <FormError message={taskError ?? undefined} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
              <Button
                onClick={async () => {
                  const result = await completeTasks(
                    openTasks.map((t) => t.id),
                  );
                  if (result.ok) setOpen(false);
                  else setTaskError(result.error);
                }}
              >
                Mark done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Record sale</DialogTitle>
              <DialogDescription>
                Records the sale of {partName} as money recovered and marks the
                part Sold.
              </DialogDescription>
            </DialogHeader>
            <form
              id="sale-form"
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <TextField
                id="sale-price"
                label="Sale price ($)"
                inputMode="decimal"
                error={errors.price_cents?.message}
                {...register("price_cents")}
              />
              <TextField
                id="sale-date"
                label="Date"
                type="date"
                error={errors.spent_on?.message}
                {...register("spent_on")}
              />
              <TextField
                id="sale-buyer"
                label="Buyer or venue"
                className="sm:col-span-2"
                error={errors.vendor?.message}
                {...register("vendor")}
              />
              <TextField
                id="sale-notes"
                label="Notes"
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
              <Button type="submit" form="sale-form" disabled={isSubmitting}>
                {isSubmitting ? "Recording…" : "Record sale"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
