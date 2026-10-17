"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { Button } from "@/components/ui/button";
import { updateVehicle } from "@/lib/actions/vehicle";
import {
  vehicleUpdateSchema,
  type VehicleUpdateFormValues,
  type VehicleUpdateInput,
} from "@/lib/schemas/vehicle";

export function VehicleForm({
  defaults,
}: {
  defaults: VehicleUpdateFormValues;
}) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, getValues, setError, formState } = useForm<
    VehicleUpdateFormValues,
    unknown,
    VehicleUpdateInput
  >({ resolver: zodResolver(vehicleUpdateSchema), defaultValues: defaults });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    setSaved(false);
    const result = await updateVehicle(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setSaved(true);
  });

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <TextField
        id="v-name"
        label="Name"
        className="sm:col-span-2"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        id="v-year"
        label="Year"
        inputMode="numeric"
        error={errors.year?.message}
        {...register("year")}
      />
      <TextField
        id="v-model"
        label="Model"
        error={errors.model?.message}
        {...register("model")}
      />
      <TextField
        id="v-generation"
        label="Generation"
        error={errors.generation?.message}
        {...register("generation")}
      />
      <TextField
        id="v-vin"
        label="VIN"
        autoCapitalize="characters"
        error={errors.vin?.message}
        {...register("vin")}
      />
      <TextField
        id="v-purchase-date"
        label="Purchase date"
        type="date"
        error={errors.purchase_date?.message}
        {...register("purchase_date")}
      />
      <TextField
        id="v-purchase-price"
        label="Purchase price ($)"
        inputMode="decimal"
        error={errors.purchase_price_cents?.message}
        {...register("purchase_price_cents")}
      />
      <TextField
        id="v-purchase-tax"
        label="Sales tax ($)"
        inputMode="decimal"
        error={errors.purchase_tax_cents?.message}
        {...register("purchase_tax_cents")}
      />
      <TextField
        id="v-purchase-fees"
        label="Licensing and registration ($)"
        inputMode="decimal"
        hint="Paid when you bought it. Later renewals: add an expense (Shipping/tax/fees)."
        error={errors.purchase_fees_cents?.message}
        {...register("purchase_fees_cents")}
      />
      <TextareaField
        id="v-notes"
        label="Notes"
        rows={10}
        hint="Free-form reference: fluids, torque specs, tire pressures."
        className="sm:col-span-2"
        error={errors.notes?.message}
        {...register("notes")}
      />
      <FormError
        message={errors.root?.message}
        className="text-destructive text-sm sm:col-span-2"
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save vehicle"}
        </Button>
        {saved && (
          <p role="status" className="text-muted-foreground text-sm">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
