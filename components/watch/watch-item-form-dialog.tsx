"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
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
import { createWatchItem, updateWatchItem } from "@/lib/actions/watch";
import { ACCEPTED_FILE_TYPES } from "@/lib/domain/media";
import {
  WATCH_SEVERITY_LABELS,
  WATCH_SYSTEM_LABELS,
  options,
} from "@/lib/labels";
import {
  watchItemSchema,
  type FollowupFormValues,
  type WatchItemFormValues,
  type WatchItemInput,
} from "@/lib/schemas/watch";
import { uploadFile } from "@/lib/upload/client";
import { EMPTY_FOLLOWUP, FollowupFields } from "./followup-fields";

export type EditableWatchItem = {
  id: string;
  title: string;
  description: string | null;
  system: WatchItemFormValues["system"];
  severity: WatchItemFormValues["severity"];
  next_followup_on: string | null;
  next_followup_odometer: number | null;
};

/** Flow 7: title, system, severity, follow-up, and (on create) an optional first check-in with a clip. */
export function WatchItemFormDialog({
  item,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onCreated,
}: {
  item?: EditableWatchItem;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const clipInput = useRef<HTMLInputElement>(null);
  const [clip, setClip] = useState<File | null>(null);
  const defaults: WatchItemFormValues = {
    title: item?.title ?? "",
    description: item?.description ?? "",
    system: item?.system ?? "other",
    severity: item?.severity ?? "monitor",
    first_observation: "",
    ...EMPTY_FOLLOWUP,
    followup_on: item?.next_followup_on ?? "",
    followup_at_odometer:
      item?.next_followup_odometer === null ||
      item?.next_followup_odometer === undefined
        ? ""
        : String(item.next_followup_odometer),
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<WatchItemFormValues, unknown, WatchItemInput>({
      resolver: zodResolver(watchItemSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    if (item) {
      const result = await updateWatchItem(item.id, getValues());
      if (!result.ok) return applyActionErrors(result, setError);
      return setOpen(false);
    }
    if (clip && !values.first_observation) {
      return setError("first_observation", {
        message: "Add an observation to attach the clip to the first check-in.",
      });
    }
    const result = await createWatchItem(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    if (clip && result.data.checkinId) {
      const upload = await uploadFile(clip, {
        parent: { kind: "watch_checkin", id: result.data.checkinId },
      });
      if (!upload.ok)
        setError("root", {
          message: `Saved, but the clip didn't upload: ${upload.error}`,
        });
    }
    setOpen(false);
    setClip(null);
    router.refresh();
    onCreated?.(result.data.id);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaults);
          setClip(null);
        }
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <ClientTrigger>{trigger}</ClientTrigger>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit watch item" : "Add watch item"}
          </DialogTitle>
        </DialogHeader>
        <form
          id="watch-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="watch-title"
            label="What did you notice?"
            placeholder="Power steering pump moaning on cold start"
            className="sm:col-span-2"
            error={errors.title?.message}
            {...register("title")}
          />
          <SelectField
            id="watch-system"
            label="System"
            options={options(WATCH_SYSTEM_LABELS)}
            error={errors.system?.message}
            {...register("system")}
          />
          <SelectField
            id="watch-severity"
            label="Severity"
            options={options(WATCH_SEVERITY_LABELS)}
            error={errors.severity?.message}
            {...register("severity")}
          />
          <TextareaField
            id="watch-description"
            label="Details"
            rows={2}
            className="sm:col-span-2"
            error={errors.description?.message}
            {...register("description")}
          />
          <FollowupFields
            register={
              register as unknown as UseFormRegister<FollowupFormValues>
            }
            errors={errors}
            idPrefix="watch"
          />
          {!item && (
            <fieldset className="flex flex-col gap-3 rounded-lg border p-3 sm:col-span-2">
              <legend className="px-1 text-sm font-medium">
                First check-in (optional)
              </legend>
              <TextareaField
                id="watch-first-observation"
                label="Today's observation"
                rows={2}
                error={errors.first_observation?.message}
                {...register("first_observation")}
              />
              <input
                ref={clipInput}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => setClip(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => clipInput.current?.click()}
                >
                  {clip ? "Change clip or photo" : "Attach clip or photo"}
                </Button>
                {clip && (
                  <span className="text-muted-foreground truncate text-xs">
                    {clip.name}
                  </span>
                )}
              </div>
            </fieldset>
          )}
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="watch-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : item ? "Save" : "Add watch item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
