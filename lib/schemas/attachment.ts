import { z } from "zod";
import { PARENT_KINDS } from "@/lib/domain/media";
import { optionalText } from "./fields";

export const parentSchema = z
  .object({ kind: z.enum(PARENT_KINDS), id: z.uuid() })
  .nullable();

export const prepareUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().max(100),
  size: z.number().int().positive(),
  withThumb: z.boolean(),
  parent: parentSchema,
});

export const finalizeUploadSchema = prepareUploadSchema.extend({
  attachmentId: z.uuid(),
  kind: z.enum(["photo", "clip", "receipt", "document"]),
  tag: z.enum(["before", "during", "after"]).nullable(),
  taken_at: z.iso.datetime({ offset: true }),
  caption: z.string().trim().max(2000).nullable(),
});

/** Edit form. Taken date is a Pacific wall time from <input type="datetime-local">. */
export const attachmentUpdateSchema = z.object({
  kind: z.enum(["photo", "clip", "receipt", "document"]),
  tag: z
    .string()
    .transform((s) => (s === "" ? null : s))
    .pipe(z.enum(["before", "during", "after"]).nullable()),
  caption: optionalText,
  taken_at_local: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
      "Enter a date and time.",
    ),
  highlight: z.boolean(),
});

export type AttachmentUpdateValues = z.input<typeof attachmentUpdateSchema>;
export type AttachmentUpdateInput = z.output<typeof attachmentUpdateSchema>;

export const mediaScopeSchema = z.object({
  kind: z.enum(["job", "phase", "part", "watch_item"]),
  id: z.uuid(),
});
export type MediaScope = z.infer<typeof mediaScopeSchema>;
