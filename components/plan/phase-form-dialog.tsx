"use client";

import { ClientTrigger } from "@/components/client-trigger";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPhase, updatePhase } from "@/lib/actions/phases";
import { centsToInput } from "@/lib/format";
import { PHASE_STATUS_LABELS, options } from "@/lib/labels";
import {
  phaseSchema,
  type PhaseFormValues,
  type PhaseInput,
} from "@/lib/schemas/phase";
import type { PlanPhase } from "@/lib/db/queries/plan";

export function PhaseFormDialog({
  phase,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  phase?: PlanPhase;
  trigger?: ReactNode;
  /** Controlled mode (e.g. opened from a menu); mount it only while open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const defaults: PhaseFormValues = {
    name: phase?.name ?? "",
    description: phase?.description ?? "",
    status: phase?.status ?? "planned",
    budget_cents: centsToInput(phase?.budget_cents),
    target_start: phase?.target_start ?? "",
    target_end: phase?.target_end ?? "",
  };
  const form = useForm<PhaseFormValues, unknown, PhaseInput>({
    resolver: zodResolver(phaseSchema),
    defaultValues: defaults,
  });
  const { register, handleSubmit, getValues, setError, reset, formState } =
    form;
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = phase
      ? await updatePhase(phase.id, getValues())
      : await createPhase(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setOpen(false);
    if (!phase) reset(defaults);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <ClientTrigger>{trigger}</ClientTrigger>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{phase ? "Edit phase" : "Add phase"}</DialogTitle>
        </DialogHeader>
        <form
          id="phase-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="phase-name"
            label="Name"
            className="sm:col-span-2"
            error={errors.name?.message}
            {...register("name")}
          />
          <SelectField
            id="phase-status"
            label="Status"
            options={options(PHASE_STATUS_LABELS)}
            error={errors.status?.message}
            {...register("status")}
          />
          <TextField
            id="phase-budget"
            label="Budget ($)"
            inputMode="decimal"
            error={errors.budget_cents?.message}
            {...register("budget_cents")}
          />
          <TextField
            id="phase-start"
            label="Target start"
            type="date"
            error={errors.target_start?.message}
            {...register("target_start")}
          />
          <TextField
            id="phase-end"
            label="Target finish"
            type="date"
            error={errors.target_end?.message}
            {...register("target_end")}
          />
          <TextareaField
            id="phase-description"
            label="Description"
            className="sm:col-span-2"
            error={errors.description?.message}
            {...register("description")}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="phase-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : phase ? "Save phase" : "Add phase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
