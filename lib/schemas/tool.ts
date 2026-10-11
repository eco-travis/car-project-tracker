import { z } from "zod";
import { optionalText } from "./fields";

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
  storage_location: optionalText,
  notes: optionalText,
});

export type ToolFormValues = z.input<typeof toolSchema>;
export type ToolInput = z.output<typeof toolSchema>;

export const jobToolSchema = z.object({
  job_id: z.uuid(),
  tool_id: z.uuid("Pick a tool."),
});
