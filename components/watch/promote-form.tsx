"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { promoteWatchItem } from "@/lib/actions/watch";
import {
  promoteSchema,
  type PromoteFormValues,
  type PromoteInput,
} from "@/lib/schemas/watch";

/** Rule 17: Diagnosis by default (or Repair), phase optional; suspected parts carry over. Opens the new job. */
export function PromoteForm({
  itemId,
  itemTitle,
  phases,
}: {
  itemId: string;
  itemTitle: string;
  phases: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { register, handleSubmit, getValues, setError, formState } = useForm<
    PromoteFormValues,
    unknown,
    PromoteInput
  >({
    resolver: zodResolver(promoteSchema),
    defaultValues: { type: "diagnosis", phase_id: "", title: itemTitle },
  });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async () => {
    const result = await promoteWatchItem(itemId, getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    router.push(`/jobs/${result.data.jobId}`);
  });
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <TextField
        id="promote-title"
        label="Job title"
        className="sm:col-span-2"
        error={errors.title?.message}
        {...register("title")}
      />
      <SelectField
        id="promote-type"
        label="Job type"
        options={[
          { value: "diagnosis", label: "Diagnosis" },
          { value: "repair", label: "Repair" },
        ]}
        error={errors.type?.message}
        {...register("type")}
      />
      <SelectField
        id="promote-phase"
        label="Phase"
        emptyLabel="No phase"
        options={phases.map((p) => ({ value: p.id, label: p.name }))}
        error={errors.phase_id?.message}
        {...register("phase_id")}
      />
      <p className="text-muted-foreground text-xs sm:col-span-2">
        Suspected parts without a job move to the new job.
      </p>
      <FormError
        message={errors.root?.message}
        className="text-destructive text-sm sm:col-span-2"
      />
      <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
        {isSubmitting ? "Promoting…" : "Promote to job"}
      </Button>
    </form>
  );
}
