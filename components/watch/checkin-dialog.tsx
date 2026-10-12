"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
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
import {
  closeWatchItem,
  createCheckin,
  setFollowup,
} from "@/lib/actions/watch";
import { ACCEPTED_FILE_TYPES } from "@/lib/domain/media";
import {
  checkinSchema,
  followupSchema,
  type CheckinFormValues,
  type CheckinInput,
  type FollowupFormInput,
  type FollowupFormValues,
} from "@/lib/schemas/watch";
import { uploadFile } from "@/lib/upload/client";
import { EMPTY_FOLLOWUP, FollowupFields } from "./followup-fields";
import { PromoteForm } from "./promote-form";

type Step = "checkin" | "next" | "followup" | "promote";

/**
 * Flow 8: log a check-in (odometer, note, optional clip), then pick one: set the next follow-up,
 * promote to a job, resolve, or dismiss (or leave it as is).
 */
export function CheckinDialog({
  item,
  today,
  currentOdometer,
  phases,
  trigger,
}: {
  item: { id: string; title: string };
  today: string;
  currentOdometer: number;
  phases: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("checkin");
  const [clip, setClip] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const clipInput = useRef<HTMLInputElement>(null);

  const checkinDefaults: CheckinFormValues = {
    checked_on: today,
    odometer: String(currentOdometer),
    observation: "",
  };
  const checkin = useForm<CheckinFormValues, unknown, CheckinInput>({
    resolver: zodResolver(checkinSchema),
    defaultValues: checkinDefaults,
  });
  const followup = useForm<FollowupFormValues, unknown, FollowupFormInput>({
    resolver: zodResolver(followupSchema),
    defaultValues: EMPTY_FOLLOWUP,
  });

  const saveCheckin = checkin.handleSubmit(async () => {
    const result = await createCheckin(item.id, checkin.getValues());
    if (!result.ok) return applyActionErrors(result, checkin.setError);
    if (clip) {
      const upload = await uploadFile(clip, {
        parent: { kind: "watch_checkin", id: result.data.id },
      });
      if (!upload.ok)
        setMessage(
          `Check-in saved, but the clip didn't upload: ${upload.error}`,
        );
    }
    router.refresh();
    setStep("next");
  });

  const saveFollowup = followup.handleSubmit(async () => {
    const result = await setFollowup(item.id, followup.getValues());
    if (!result.ok) return applyActionErrors(result, followup.setError);
    setOpen(false);
  });

  function close(status: "resolved" | "dismissed") {
    startTransition(async () => {
      const result = await closeWatchItem(item.id, status);
      if (result.ok) setOpen(false);
      else setMessage(result.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setStep("checkin");
          setClip(null);
          setMessage(null);
          checkin.reset(checkinDefaults);
          followup.reset(EMPTY_FOLLOWUP);
        }
      }}
    >
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {step === "checkin" && (
          <>
            <DialogHeader>
              <DialogTitle>Check in</DialogTitle>
              <DialogDescription>{item.title}</DialogDescription>
            </DialogHeader>
            <form
              id="checkin-form"
              onSubmit={saveCheckin}
              noValidate
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <TextField
                id="checkin-date"
                label="Date"
                type="date"
                error={checkin.formState.errors.checked_on?.message}
                {...checkin.register("checked_on")}
              />
              <TextField
                id="checkin-odometer"
                label="Odometer (miles)"
                inputMode="numeric"
                error={checkin.formState.errors.odometer?.message}
                {...checkin.register("odometer")}
              />
              <TextareaField
                id="checkin-observation"
                label="What did you observe?"
                rows={3}
                className="sm:col-span-2"
                error={checkin.formState.errors.observation?.message}
                {...checkin.register("observation")}
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
              <div className="flex items-center gap-2 sm:col-span-2">
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
              <FormError
                message={checkin.formState.errors.root?.message}
                className="text-destructive text-sm sm:col-span-2"
              />
            </form>
            <DialogFooter>
              <Button
                type="submit"
                form="checkin-form"
                disabled={checkin.formState.isSubmitting}
              >
                {checkin.formState.isSubmitting ? "Saving…" : "Save check-in"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "next" && (
          <>
            <DialogHeader>
              <DialogTitle>Check-in saved</DialogTitle>
              <DialogDescription>
                What next for “{item.title}”?
              </DialogDescription>
            </DialogHeader>
            {message && (
              <p role="alert" className="text-destructive text-sm">
                {message}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setStep("followup")}>
                Set next follow-up
              </Button>
              <Button variant="outline" onClick={() => setStep("promote")}>
                Promote to job
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => close("resolved")}
              >
                Resolve
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => close("dismissed")}
              >
                Dismiss
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Leave as is
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "followup" && (
          <>
            <DialogHeader>
              <DialogTitle>Set next follow-up</DialogTitle>
            </DialogHeader>
            <form
              id="followup-form"
              onSubmit={saveFollowup}
              noValidate
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <FollowupFields
                register={
                  followup.register as UseFormRegister<FollowupFormValues>
                }
                errors={followup.formState.errors}
                idPrefix="next"
              />
              <FormError
                message={followup.formState.errors.root?.message}
                className="text-destructive text-sm sm:col-span-2"
              />
            </form>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("next")}>
                Back
              </Button>
              <Button
                type="submit"
                form="followup-form"
                disabled={followup.formState.isSubmitting}
              >
                Save follow-up
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "promote" && (
          <>
            <DialogHeader>
              <DialogTitle>Promote to job</DialogTitle>
            </DialogHeader>
            <PromoteForm
              itemId={item.id}
              itemTitle={item.title}
              phases={phases}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("next")}>
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
