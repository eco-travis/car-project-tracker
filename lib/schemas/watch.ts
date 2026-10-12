import { z } from "zod";
import { PROMOTE_JOB_TYPES } from "@/lib/domain/watch";
import {
  MAX_ODOMETER,
  optionalDate,
  optionalId,
  optionalInt,
  optionalText,
  requiredDate,
} from "./fields";

export const WATCH_SYSTEMS = [
  "engine",
  "drivetrain",
  "suspension",
  "steering",
  "brakes",
  "electrical",
  "body",
  "other",
] as const;
export const WATCH_SEVERITIES = ["monitor", "concerning", "act_soon"] as const;

/** Follow-up inputs (rule 16): relative ("in 3 months", "in 3,000 miles") or absolute. */
export const followupSchema = z.object({
  followup_in_amount: optionalInt("Follow-up interval", 1, 120),
  followup_in_unit: z.enum(["days", "weeks", "months"]),
  followup_on: optionalDate,
  followup_in_miles: optionalInt("Miles", 1, 100000),
  followup_at_odometer: optionalInt("Odometer", 0, MAX_ODOMETER),
});

export type FollowupFormValues = z.input<typeof followupSchema>;
export type FollowupFormInput = z.output<typeof followupSchema>;

export const watchItemSchema = followupSchema.extend({
  title: z.string().trim().min(1, "Describe what you noticed."),
  description: optionalText,
  system: z.enum(WATCH_SYSTEMS),
  severity: z.enum(WATCH_SEVERITIES),
  /** Create only: optional first check-in (flow 7). */
  first_observation: optionalText,
});

export type WatchItemFormValues = z.input<typeof watchItemSchema>;
export type WatchItemInput = z.output<typeof watchItemSchema>;

export const checkinSchema = z.object({
  checked_on: requiredDate,
  odometer: optionalInt("Odometer", 0, MAX_ODOMETER),
  observation: optionalText,
});

export type CheckinFormValues = z.input<typeof checkinSchema>;
export type CheckinInput = z.output<typeof checkinSchema>;

export const promoteSchema = z.object({
  type: z.enum(PROMOTE_JOB_TYPES),
  phase_id: optionalId,
  title: optionalText,
});

export type PromoteFormValues = z.input<typeof promoteSchema>;
export type PromoteInput = z.output<typeof promoteSchema>;

export function toFollowupInput(v: FollowupFormInput) {
  return {
    in_amount: v.followup_in_amount,
    in_unit: v.followup_in_amount !== null ? v.followup_in_unit : null,
    on: v.followup_on,
    in_miles: v.followup_in_miles,
    at_odometer: v.followup_at_odometer,
  };
}
