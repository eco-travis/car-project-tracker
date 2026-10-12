"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { UploadButton } from "@/components/media/upload-button";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
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
import { completeJob, installReceivedParts } from "@/lib/actions/jobs";
import { PERFORMED_BY_LABELS, options } from "@/lib/labels";
import {
  completionSchema,
  type CompletionFormValues,
  type CompletionInput,
} from "@/lib/schemas/job";

export type CompletionJob = {
  id: string;
  status: string;
  completed_on: string | null;
  completed_odometer: number | null;
  performed_by: string | null;
  performer_name: string | null;
  diy_hours: number | null;
};

type Props = {
  job: CompletionJob;
  /** Rule 3 pre-fill: today and the vehicle's current odometer. */
  defaults: { completed_on: string; completed_odometer: number };
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Mark done (rule 3), then offer the rule 4 follow-up. Also edits a done job's completion. */
export function CompletionDialog({
  job,
  defaults,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const editing = job.status === "done";
  const [followUp, setFollowUp] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const [partsInstalled, setPartsInstalled] = useState(false);

  const values: CompletionFormValues = {
    completed_on: job.completed_on ?? defaults.completed_on,
    completed_odometer: String(
      job.completed_odometer ?? defaults.completed_odometer,
    ),
    performed_by: job.performed_by ?? "",
    performer_name: job.performer_name ?? "",
    diy_hours: job.diy_hours === null ? "" : String(job.diy_hours),
  };
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    control,
    formState,
  } = useForm<CompletionFormValues, unknown, CompletionInput>({
    resolver: zodResolver(completionSchema),
    defaultValues: values,
  });
  const { errors, isSubmitting } = formState;
  const performedBy = useWatch({ control, name: "performed_by" });

  const onSubmit = handleSubmit(async () => {
    const result = await completeJob(job.id, getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    // Rule 4: offer (never force) installing Received parts and adding after photos.
    if (!editing) setFollowUp(result.data.receivedParts);
    else setOpen(false);
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset(values);
      setFollowUp(null);
      setFollowUpMessage(null);
      setPartsInstalled(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          <ClientTrigger>{trigger}</ClientTrigger>
        </DialogTrigger>
      )}
      <DialogContent>
        {followUp ? (
          <>
            <DialogHeader>
              <DialogTitle>Job marked done</DialogTitle>
              <DialogDescription>
                Optional follow-ups. You can also do these later from the job
                page.
              </DialogDescription>
            </DialogHeader>
            {followUp.length > 0 && (
              <section
                aria-label="Received parts"
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                {partsInstalled ? (
                  <p role="status" className="text-sm">
                    Parts marked Installed.
                  </p>
                ) : (
                  <>
                    <p className="text-sm">
                      {followUp.length === 1
                        ? "1 part on this job is marked Received. Mark it Installed?"
                        : `${followUp.length} parts on this job are marked Received. Mark them Installed?`}
                    </p>
                    <ul className="list-disc pl-5 text-sm">
                      {followUp.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                    <FormError message={followUpMessage ?? undefined} />
                    <Button
                      variant="outline"
                      className="self-start"
                      onClick={async () => {
                        const result = await installReceivedParts(job.id);
                        if (result.ok) setPartsInstalled(true);
                        else setFollowUpMessage(result.error);
                      }}
                    >
                      Mark installed
                    </Button>
                  </>
                )}
              </section>
            )}
            <section
              aria-label="After photos"
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">
                Add after photos? They&apos;re tagged After.
              </p>
              <UploadButton
                parent={{ kind: "job", id: job.id }}
                tag="after"
                label="Add after photos"
              />
            </section>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit completion" : "Mark job done"}
              </DialogTitle>
              <DialogDescription>
                A higher odometer reading also updates the vehicle&apos;s
                odometer.
              </DialogDescription>
            </DialogHeader>
            <form
              id="completion-form"
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <TextField
                id="completed-on"
                label="Completed on"
                type="date"
                error={errors.completed_on?.message}
                {...register("completed_on")}
              />
              <TextField
                id="completed-odometer"
                label="Odometer (miles)"
                inputMode="numeric"
                error={errors.completed_odometer?.message}
                {...register("completed_odometer")}
              />
              <SelectField
                id="performed-by"
                label="Performed by"
                emptyLabel="Not recorded"
                options={options(PERFORMED_BY_LABELS)}
                error={errors.performed_by?.message}
                {...register("performed_by")}
              />
              {(performedBy === "rented_bay" || performedBy === "shop") && (
                <TextField
                  id="performer-name"
                  label={performedBy === "shop" ? "Shop name" : "Garage name"}
                  error={errors.performer_name?.message}
                  {...register("performer_name")}
                />
              )}
              <TextField
                id="diy-hours"
                label="DIY hours"
                inputMode="decimal"
                error={errors.diy_hours?.message}
                {...register("diy_hours")}
              />
              <FormError
                message={errors.root?.message}
                className="text-destructive text-sm sm:col-span-2"
              />
            </form>
            <DialogFooter>
              <Button
                type="submit"
                form="completion-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : editing ? "Save" : "Mark done"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
