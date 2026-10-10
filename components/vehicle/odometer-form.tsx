"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionErrors } from "@/components/form/apply-errors";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { updateOdometer } from "@/lib/actions/vehicle";
import { formatMiles } from "@/lib/format";

/** Rule 14: manual updates may only go up. The server enforces it; this form just reports. */
export function OdometerForm({ current }: { current: number }) {
  const [saved, setSaved] = useState<number | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<{
    current_odometer: string;
  }>({
    defaultValues: { current_odometer: String(current) },
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setSaved(null);
    const result = await updateOdometer(values);
    if (!result.ok) return applyActionErrors(result, setError);
    setSaved(result.data.current_odometer);
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-wrap items-end gap-2"
    >
      <TextField
        id="odometer"
        label="Current odometer (miles)"
        inputMode="numeric"
        className="w-56"
        error={errors.current_odometer?.message ?? errors.root?.message}
        {...register("current_odometer")}
      />
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        Update odometer
      </Button>
      {saved !== null && (
        <p role="status" className="text-muted-foreground w-full text-sm">
          Odometer set to {formatMiles(saved)}.
        </p>
      )}
    </form>
  );
}
