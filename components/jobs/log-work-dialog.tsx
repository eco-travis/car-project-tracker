"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { UploadButton } from "@/components/media/upload-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logWork } from "@/lib/actions/jobs";
import { JOB_TYPE_LABELS, PERFORMED_BY_LABELS, options } from "@/lib/labels";
import {
  logWorkSchema,
  type LogWorkFormValues,
  type LogWorkInput,
} from "@/lib/schemas/job";

/**
 * Log work that's already finished: a new Done job in one step, then an offer to add photos.
 * Pre-fills today and the current odometer, as Mark done does (rule 3).
 */
export function LogWorkDialog({
  phases,
  defaults,
}: {
  phases: { id: string; name: string }[];
  defaults: { completed_on: string; completed_odometer: number };
}) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setN((x) => x + 1);
          setOpen(true);
        }}
      >
        <Plus aria-hidden /> Log work
      </Button>
      {/* Kept mounted so Radix can finish closing; a new key per opening resets the form. */}
      <LogWorkForm
        key={n}
        open={open}
        onOpenChange={setOpen}
        phases={phases}
        defaults={defaults}
      />
    </>
  );
}

function LogWorkForm({
  open,
  onOpenChange,
  phases,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: { id: string; name: string }[];
  defaults: { completed_on: string; completed_odometer: number };
}) {
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [photosAdded, setPhotosAdded] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LogWorkFormValues, unknown, LogWorkInput>({
    resolver: zodResolver(logWorkSchema),
    defaultValues: {
      title: "",
      type: "maintenance",
      phase_id: "",
      notes: "",
      completed_on: defaults.completed_on,
      completed_odometer: String(defaults.completed_odometer),
      performed_by: "diy",
      performer_name: "",
      diy_hours: "",
    },
  });
  const performedBy = useWatch({ control, name: "performed_by" });

  const onSubmit = handleSubmit(async () => {
    const result = await logWork(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setSaved({ id: result.data.id, title: getValues("title") });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {saved ? (
          <>
            <DialogHeader>
              <DialogTitle>Work logged</DialogTitle>
              <DialogDescription>
                &ldquo;{saved.title}&rdquo; is in the Work Log.
              </DialogDescription>
            </DialogHeader>
            <section
              aria-label="Photos"
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">Add photos? They&apos;re tagged After.</p>
              <UploadButton
                parent={{ kind: "job", id: saved.id }}
                tag="after"
                label={photosAdded ? "Add more photos" : "Add photos"}
                onUploaded={() => setPhotosAdded(true)}
              />
              {photosAdded && (
                <p role="status" className="text-muted-foreground text-xs">
                  Photos added.
                </p>
              )}
            </section>
            <DialogFooter>
              <Button variant="outline" asChild>
                <Link href={`/jobs/${saved.id}`}>Open job</Link>
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Log work</DialogTitle>
              <DialogDescription>
                Record work that&apos;s already done. A higher odometer reading
                also updates the vehicle&apos;s odometer.
              </DialogDescription>
            </DialogHeader>
            <form
              id="log-work-form"
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <TextField
                id="logwork-title"
                label="What was done"
                placeholder="Oil and filter change"
                className="sm:col-span-2"
                error={errors.title?.message}
                {...register("title")}
              />
              <SelectField
                id="logwork-type"
                label="Type"
                options={options(JOB_TYPE_LABELS)}
                error={errors.type?.message}
                {...register("type")}
              />
              <SelectField
                id="logwork-phase"
                label="Phase"
                emptyLabel="None"
                options={phases.map((p) => ({ value: p.id, label: p.name }))}
                error={errors.phase_id?.message}
                {...register("phase_id")}
              />
              <TextField
                id="logwork-date"
                label="Completed on"
                type="date"
                error={errors.completed_on?.message}
                {...register("completed_on")}
              />
              <TextField
                id="logwork-odometer"
                label="Odometer (miles)"
                inputMode="numeric"
                error={errors.completed_odometer?.message}
                {...register("completed_odometer")}
              />
              <SelectField
                id="logwork-performed-by"
                label="Performed by"
                emptyLabel="Not recorded"
                options={options(PERFORMED_BY_LABELS)}
                error={errors.performed_by?.message}
                {...register("performed_by")}
              />
              {performedBy === "rented_bay" || performedBy === "shop" ? (
                <TextField
                  id="logwork-performer-name"
                  label={performedBy === "shop" ? "Shop name" : "Garage name"}
                  error={errors.performer_name?.message}
                  {...register("performer_name")}
                />
              ) : (
                <TextField
                  id="logwork-diy-hours"
                  label="DIY hours"
                  inputMode="decimal"
                  error={errors.diy_hours?.message}
                  {...register("diy_hours")}
                />
              )}
              <TextareaField
                id="logwork-notes"
                label="Notes"
                rows={3}
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
              <Button
                type="submit"
                form="log-work-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Log work"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
