import { z } from "zod";
import { normalizeTags } from "@/lib/domain/inspiration";
import { JOB_TYPES } from "./job";
import { optionalId, optionalText, optionalUrl } from "./fields";

export const inspirationSchema = z.object({
  title: z.string().trim().min(1, "Give it a title."),
  source_url: optionalUrl,
  tags: z.string().transform((s) => normalizeTags(s)),
  notes: optionalText,
});

export type InspirationFormValues = z.input<typeof inspirationSchema>;
export type InspirationInput = z.output<typeof inspirationSchema>;

export const promoteInspirationSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("part"),
    overwrite: z.boolean().default(false),
  }),
  z.object({
    target: z.literal("job"),
    overwrite: z.boolean().default(false),
    phase_id: optionalId,
    type: z.enum(JOB_TYPES),
  }),
]);
