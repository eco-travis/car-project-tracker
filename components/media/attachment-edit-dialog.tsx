"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAttachment, updateAttachment } from "@/lib/actions/attachments";
import type { MediaItem } from "@/lib/db/queries/media";
import { toPacificLocalInput } from "@/lib/format";
import {
  attachmentUpdateSchema,
  type AttachmentUpdateInput,
  type AttachmentUpdateValues,
} from "@/lib/schemas/attachment";

export function AttachmentEditDialog({
  item,
  trigger,
}: {
  item: MediaItem;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const defaults: AttachmentUpdateValues = {
    kind: item.kind,
    tag: item.tag ?? "",
    caption: item.caption ?? "",
    taken_at_local: toPacificLocalInput(item.takenAt),
    highlight: item.highlight,
  };
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState,
  } = useForm<AttachmentUpdateValues, unknown, AttachmentUpdateInput>({
    resolver: zodResolver(attachmentUpdateSchema),
    defaultValues: defaults,
  });
  const { errors, isSubmitting } = formState;
  const kindOptions = item.mime.startsWith("image/")
    ? [
        { value: "photo", label: "Photo" },
        { value: "receipt", label: "Receipt" },
      ]
    : item.mime === "application/pdf"
      ? [
          { value: "document", label: "Document" },
          { value: "receipt", label: "Receipt" },
        ]
      : [{ value: "clip", label: "Clip" }];

  const onSubmit = handleSubmit(async () => {
    const result = await updateAttachment(item.id, getValues());
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
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit attachment</DialogTitle>
        </DialogHeader>
        <form
          id="attachment-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <SelectField
            id="att-kind"
            label="Kind"
            options={kindOptions}
            error={errors.kind?.message}
            {...register("kind")}
          />
          <SelectField
            id="att-tag"
            label="Tag"
            emptyLabel="None"
            options={[
              { value: "before", label: "Before" },
              { value: "during", label: "During" },
              { value: "after", label: "After" },
            ]}
            error={errors.tag?.message}
            {...register("tag")}
          />
          <TextField
            id="att-taken"
            label="Taken (Pacific time)"
            type="datetime-local"
            className="sm:col-span-2"
            error={errors.taken_at_local?.message}
            {...register("taken_at_local")}
          />
          <TextareaField
            id="att-caption"
            label="Caption"
            rows={2}
            className="sm:col-span-2"
            error={errors.caption?.message}
            {...register("caption")}
          />
          <Controller
            control={control}
            name="highlight"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="size-4"
                />
                Highlight (shows in the Gallery&apos;s progress view)
              </label>
            )}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter className="sm:justify-between">
          <ConfirmButton
            title="Delete attachment"
            description="Delete this file? It's removed from storage and can't be recovered."
            confirmLabel="Delete file"
            onConfirm={async () => {
              const result = await deleteAttachment(item.id);
              if (result.ok) setOpen(false);
              return result;
            }}
            trigger={
              <Button type="button" variant="ghost">
                Delete
              </Button>
            }
          />
          <Button type="submit" form="attachment-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
