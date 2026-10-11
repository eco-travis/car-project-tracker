import { z } from "zod";
import {
  optionalId,
  optionalText,
  requiredDate,
  requiredMoney,
} from "./fields";

/** Sale entries only come from Record sale (rule 7), so the ledger form doesn't offer them. */
export const LEDGER_CATEGORIES = [
  "part",
  "tool",
  "shop_labor_bay",
  "shipping_tax_fees",
  "fluids_consumables",
  "other",
] as const;
export const EXPENSE_STATES = ["committed", "paid"] as const;

export const expenseSchema = z.object({
  spent_on: requiredDate,
  amount_cents: requiredMoney("Amount", { allowNegative: true }),
  category: z.enum(LEDGER_CATEGORIES, "Pick a category."),
  state: z.enum(EXPENSE_STATES),
  vendor: optionalText,
  notes: optionalText,
  part_id: optionalId,
  tool_id: optionalId,
  job_id: optionalId,
  phase_id: optionalId,
});

export type ExpenseFormValues = z.input<typeof expenseSchema>;
export type ExpenseInput = z.output<typeof expenseSchema>;

export const saleSchema = z.object({
  price_cents: requiredMoney("Sale price"),
  spent_on: requiredDate,
  vendor: optionalText,
  notes: optionalText,
});

export type SaleFormValues = z.input<typeof saleSchema>;
export type SaleInput = z.output<typeof saleSchema>;
