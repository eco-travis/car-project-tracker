import { z } from "zod";
import { optionalDate, optionalMoney, optionalText } from "./fields";

export const PHASE_STATUSES = ["planned", "active", "done"] as const;

export const phaseSchema = z
  .object({
    name: z.string().trim().min(1, "Give the phase a name."),
    description: optionalText,
    status: z.enum(PHASE_STATUSES),
    budget_cents: optionalMoney("Budget"),
    target_start: optionalDate,
    target_end: optionalDate,
  })
  .refine(
    (p) => !p.target_start || !p.target_end || p.target_end >= p.target_start,
    {
      path: ["target_end"],
      message: "Target finish can't be before the start.",
    },
  );

export type PhaseFormValues = z.input<typeof phaseSchema>;
export type PhaseInput = z.output<typeof phaseSchema>;
