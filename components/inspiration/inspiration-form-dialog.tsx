"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
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
import { ClientTrigger } from "@/components/client-trigger";
import {
  createInspiration,
  updateInspiration,
} from "@/lib/actions/inspiration";
import {
  inspirationSchema,
  type InspirationFormValues,
  type InspirationInput,
} from "@/lib/schemas/inspiration";
import { uploadFile } from "@/lib/upload/client";

export type EditableInspiration = {
  id: string;
  title: string;
  source_url: string | null;
  tags: string[];
  notes: string | null;
};

/** Add an idea (title, link, tags, notes, images) or edit one. */
export function InspirationFormDialog({
  inspiration,
  trigger,
}: {
  inspiration?: EditableInspiration;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const defaults: InspirationFormValues = {
    title: inspiration?.title ?? "",
    source_url: inspiration?.source_url ?? "",
    tags: inspiration?.tags.join(", ") ?? "",
    notes: inspiration?.notes ?? "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<InspirationFormValues, unknown, InspirationInput>({
      resolver: zodResolver(inspirationSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    if (inspiration) {
      const result = await updateInspiration(inspiration.id, getValues());
      if (!result.ok) return applyActionErrors(result, setError);
      return setOpen(false);
    }
    const result = await createInspiration(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    for (const file of images) {
      const upload = await uploadFile(file, {
        parent: { kind: "inspiration", id: result.data.id },
      });
      if (!upload.ok) {
        setError("root", {
          message: `Saved, but an image didn't upload: ${upload.error}`,
        });
        router.refresh();
        return;
      }
    }
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaults);
          setImages([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspiration ? "Edit idea" : "Add idea"}</DialogTitle>
        </DialogHeader>
        <form
          id="inspiration-form"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <TextField
            id="insp-title"
            label="Title"
            placeholder="Rival skid plate set"
            error={errors.title?.message}
            {...register("title")}
          />
          <TextField
            id="insp-url"
            label="Source link"
            inputMode="url"
            placeholder="Forum thread, Instagram, YouTube, vendor page"
            error={errors.source_url?.message}
            {...register("source_url")}
          />
          <TextField
            id="insp-tags"
            label="Tags"
            placeholder="armor, lighting, sleep system"
            hint="Separate with commas."
            error={errors.tags?.message}
            {...register("tags")}
          />
          <TextareaField
            id="insp-notes"
            label="Notes"
            rows={3}
            error={errors.notes?.message}
            {...register("notes")}
          />
          {!inspiration && (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => setImages([...(e.target.files ?? [])])}
              />
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => fileInput.current?.click()}
              >
                {images.length
                  ? `${images.length} image${images.length === 1 ? "" : "s"} selected`
                  : "Add images or screenshots"}
              </Button>
            </div>
          )}
          <FormError message={errors.root?.message} />
        </form>
        <DialogFooter>
          <Button type="submit" form="inspiration-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : inspiration ? "Save" : "Add idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
