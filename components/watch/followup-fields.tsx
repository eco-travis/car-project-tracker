"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, controlClass, fieldAria } from "@/components/form/field";
import { TextField } from "@/components/form/text-field";
import type { FollowupFormValues } from "@/lib/schemas/watch";
import { cn } from "@/lib/utils";

/** Rule 16 inputs: "in N days/weeks/months" or a date; "in N miles" or an odometer reading. */
export function FollowupFields({
  register,
  errors,
  idPrefix,
}: {
  register: UseFormRegister<FollowupFormValues>;
  errors: FieldErrors<FollowupFormValues>;
  idPrefix: string;
}) {
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <fieldset className="grid grid-cols-1 gap-4 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Next follow-up</legend>
      <p className="text-muted-foreground -mt-1 text-xs sm:col-span-2">
        Date, mileage, or both. Due at whichever comes first.
      </p>
      <Field
        id={id("in-amount")}
        label="Follow up in"
        error={errors.followup_in_amount?.message}
      >
        <div className="flex gap-2">
          <input
            id={id("in-amount")}
            inputMode="numeric"
            placeholder="3"
            className={cn(controlClass, "h-8 w-20")}
            {...fieldAria(id("in-amount"), errors.followup_in_amount?.message)}
            {...register("followup_in_amount")}
          />
          <select
            aria-label="Interval unit"
            className={cn(controlClass, "h-8 w-28")}
            {...register("followup_in_unit")}
          >
            <option value="days">days</option>
            <option value="weeks">weeks</option>
            <option value="months">months</option>
          </select>
        </div>
      </Field>
      <TextField
        id={id("on")}
        label="…or on date"
        type="date"
        error={errors.followup_on?.message}
        {...register("followup_on")}
      />
      <TextField
        id={id("in-miles")}
        label="Follow up in miles"
        inputMode="numeric"
        placeholder="3,000"
        error={errors.followup_in_miles?.message}
        {...register("followup_in_miles")}
      />
      <TextField
        id={id("at-odometer")}
        label="…or at odometer"
        inputMode="numeric"
        error={errors.followup_at_odometer?.message}
        {...register("followup_at_odometer")}
      />
    </fieldset>
  );
}

export const EMPTY_FOLLOWUP: FollowupFormValues = {
  followup_in_amount: "",
  followup_in_unit: "months",
  followup_on: "",
  followup_in_miles: "",
  followup_at_odometer: "",
};
