import { z } from "zod";
import { optionalMoney, optionalText } from "./fields";

export const TOOL_STATUSES = [
  "owned",
  "borrowed",
  "rented",
  "need_to_buy",
] as const;

export const toolSchema = z.object({
  name: z.string().trim().min(1, "Give the tool a name."),
  brand: optionalText,
  description: optionalText,
  status: z.enum(TOOL_STATUSES),
  bought_for_project: z.boolean(),
  notes: optionalText,
});

/** Add tool can also record what it cost: a paid "tool" expense dated today, linked to it. */
export const newToolSchema = toolSchema.extend({
  cost_cents: optionalMoney("Cost"),
});

export type ToolFormValues = z.input<typeof newToolSchema>;
export type ToolInput = z.output<typeof newToolSchema>;

export const jobToolSchema = z.object({
  job_id: z.uuid(),
  tool_id: z.uuid("Pick a tool."),
});
