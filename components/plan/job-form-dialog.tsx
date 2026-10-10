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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createJob, updateJob } from "@/lib/actions/jobs";
import { centsToInput } from "@/lib/format";
import { JOB_TYPE_LABELS, options } from "@/lib/labels";
import {
  jobSchema,
  type JobFormValues,
  type JobInput,
} from "@/lib/schemas/job";
import type { JobType } from "@/lib/domain/types";

export type EditableJob = {
  id: string;
  title: string;
  description: string | null;
  type: JobType;
  phase_id: string | null;
  budget_cents: number | null;
  notes: string | null;
  links: string[];
};

export function JobFormDialog({
  job,
  phases,
  defaultPhaseId,
  trigger,
}: {
  job?: EditableJob;
  phases: { id: string; name: string }[];
  defaultPhaseId?: string | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const defaults: JobFormValues = {
    title: job?.title ?? "",
    description: job?.description ?? "",
    type: job?.type ?? ("" as JobType),
    phase_id: job?.phase_id ?? defaultPhaseId ?? "",
    budget_cents: centsToInput(job?.budget_cents),
    notes: job?.notes ?? "",
    links: job?.links.join("\n") ?? "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<JobFormValues, unknown, JobInput>({
      resolver: zodResolver(jobSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = job
      ? await updateJob(job.id, getValues())
      : await createJob(getValues());
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
          <DialogTitle>{job ? "Edit job" : "Add job"}</DialogTitle>
        </DialogHeader>
        <form
          id="job-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="job-title"
            label="Title"
            className="sm:col-span-2"
            error={errors.title?.message}
            {...register("title")}
          />
          <SelectField
            id="job-type"
            label="Type"
            emptyLabel="Choose…"
            options={options(JOB_TYPE_LABELS)}
            error={errors.type?.message}
            {...register("type")}
          />
          <SelectField
            id="job-phase"
            label="Phase"
            emptyLabel="No phase"
            options={phases.map((p) => ({ value: p.id, label: p.name }))}
            error={errors.phase_id?.message}
            {...register("phase_id")}
          />
          <TextField
            id="job-budget"
            label="Budget ($)"
            inputMode="decimal"
            error={errors.budget_cents?.message}
            {...register("budget_cents")}
          />
          <TextareaField
            id="job-description"
            label="Description"
            className="sm:col-span-2"
            error={errors.description?.message}
            {...register("description")}
          />
          <TextareaField
            id="job-notes"
            label="Notes"
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />
          <TextareaField
            id="job-links"
            label="Links"
            hint="One per line: how-to videos, forum threads, service docs."
            className="sm:col-span-2"
            error={errors.links?.message}
            {...register("links")}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="job-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : job ? "Save job" : "Add job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
