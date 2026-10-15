import { z } from "zod";
import { completionErrors } from "@/lib/domain/jobs";
import {
  MAX_ODOMETER,
  optionalDecimal,
  optionalEnum,
  optionalId,
  optionalInt,
  optionalMoney,
  optionalDate,
  optionalText,
  urlLines,
} from "./fields";

export const JOB_TYPES = [
  "maintenance",
  "repair",
  "modification",
  "diagnosis",
] as const;
export const JOB_STATUSES = [
  "not_started",
  "waiting_on_parts",
  "ready",
  "in_progress",
  "done",
  "cancelled",
] as const;
export const PERFORMED_BY = ["diy", "rented_bay", "shop"] as const;

/** Planning fields of a job (create and edit). */
export const jobSchema = z.object({
  title: z.string().trim().min(1, "Give the job a title."),
  description: optionalText,
  type: z.enum(JOB_TYPES, "Pick a type."),
  phase_id: optionalId,
  budget_cents: optionalMoney("Budget"),
  notes: optionalText,
  links: urlLines,
});

export type JobFormValues = z.input<typeof jobSchema>;
export type JobInput = z.output<typeof jobSchema>;

/** Mark done (and editing a done job's completion). Rule 3: date and odometer are required. */
const completionFields = {
  completed_on: optionalDate,
  completed_odometer: optionalInt("Odometer", 0, MAX_ODOMETER),
  performed_by: optionalEnum(PERFORMED_BY),
  performer_name: optionalText,
  diy_hours: optionalDecimal("DIY hours"),
};

function refineCompletion(
  c: Parameters<typeof completionErrors>[0],
  ctx: z.RefinementCtx,
) {
  for (const [path, message] of Object.entries(completionErrors(c))) {
    ctx.addIssue({ code: "custom", path: [path], message });
  }
}

export const completionSchema = z
  .object(completionFields)
  .superRefine(refineCompletion);

export type CompletionFormValues = z.input<typeof completionSchema>;
export type CompletionInput = z.output<typeof completionSchema>;

/** Log work: record already-finished work as a new Done job in one step (Work Log screen). */
export const logWorkSchema = jobSchema
  .pick({ title: true, type: true, phase_id: true, notes: true })
  .extend(completionFields)
  .superRefine(refineCompletion);

export type LogWorkFormValues = z.input<typeof logWorkSchema>;
export type LogWorkInput = z.output<typeof logWorkSchema>;

/** Status changes other than Done (which goes through completionSchema). */
export const statusChangeSchema = z.object({
  status: z.enum(JOB_STATUSES).exclude(["done"]),
});

export const dependencySchema = z.object({
  job_id: z.uuid(),
  blocked_by_job_id: z.uuid("Pick a job."),
});
