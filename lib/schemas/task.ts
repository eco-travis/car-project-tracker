import { z } from "zod";
import { taskLinkError } from "@/lib/domain/tasks";
import { optionalDate, optionalText } from "./fields";

const id = z
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const taskLinkSchema = z
  .object({
    job_id: id,
    part_id: id,
    phase_id: id,
    watch_item_id: id,
    blocks_job: z.boolean().default(false),
  })
  .superRefine((l, ctx) => {
    const error = taskLinkError(l);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });

export type TaskLinkInput = z.output<typeof taskLinkSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "What needs doing?"),
  notes: optionalText,
  due_on: optionalDate,
  links: z.array(taskLinkSchema).max(20),
});

export type TaskFormValues = z.input<typeof taskSchema>;
export type TaskInput = z.output<typeof taskSchema>;
