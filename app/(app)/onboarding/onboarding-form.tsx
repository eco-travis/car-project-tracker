"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { createVehicle } from "@/lib/actions/vehicle";
import {
  vehicleSchema,
  type VehicleFormValues,
  type VehicleInput,
} from "@/lib/schemas/vehicle";

const defaults: VehicleFormValues = {
  name: "",
  year: "",
  model: "",
  generation: "",
  vin: "",
  current_odometer: "",
  purchase_date: "",
  purchase_price_cents: "",
};

export function OnboardingForm() {
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues, unknown, VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: defaults,
  });

  // Send the raw strings; the server action re-parses with the same schema.
  const onSubmit = handleSubmit(async () => {
    const result = await createVehicle(getValues());
    if (result && !result.ok) {
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        setError(field as keyof VehicleFormValues, { message: messages[0] });
      }
      if (!result.fieldErrors) setError("root", { message: result.error });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <TextField
        label="Name"
        placeholder="2004 Cayenne Turbo"
        className="sm:col-span-2"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Year"
        inputMode="numeric"
        placeholder="2004"
        error={errors.year?.message}
        {...register("year")}
      />
      <TextField
        label="Model"
        placeholder="Cayenne Turbo"
        error={errors.model?.message}
        {...register("model")}
      />
      <TextField
        label="Generation"
        placeholder="955"
        error={errors.generation?.message}
        {...register("generation")}
      />
      <TextField
        label="VIN"
        autoCapitalize="characters"
        error={errors.vin?.message}
        {...register("vin")}
      />
      <TextField
        label="Current odometer (miles)"
        inputMode="numeric"
        error={errors.current_odometer?.message}
        {...register("current_odometer")}
      />
      <TextField
        label="Purchase date"
        type="date"
        error={errors.purchase_date?.message}
        {...register("purchase_date")}
      />
      <TextField
        label="Purchase price ($)"
        inputMode="decimal"
        placeholder="12,500"
        error={errors.purchase_price_cents?.message}
        {...register("purchase_price_cents")}
      />
      {errors.root && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
        {isSubmitting ? "Creating…" : "Create vehicle"}
      </Button>
    </form>
  );
}
