"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionErrors } from "@/components/form/apply-errors";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPart, updatePart } from "@/lib/actions/parts";
import type { Option } from "@/lib/db/queries/options";
import {
  PART_CATEGORY_LABELS,
  PART_STATUS_LABELS,
  options,
} from "@/lib/labels";
import {
  partSchema,
  type PartFormValues,
  type PartInput,
} from "@/lib/schemas/part";
import type { Database } from "@/lib/db/types";

type Part = Database["public"]["Tables"]["parts"]["Row"];

export function PartFormDialog({
  part,
  jobs,
  parts,
  defaultJobId,
  openAfterCreate = false,
  trigger,
}: {
  part?: Part;
  jobs: Option[];
  parts: Option[];
  defaultJobId?: string;
  /** Navigate to the new part's page after creating it. */
  openAfterCreate?: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaults: PartFormValues = {
    name: part?.name ?? "",
    brand: part?.brand ?? "",
    category: part?.category ?? "other",
    status: part?.status ?? "idea",
    oem_part_number: part?.oem_part_number ?? "",
    superseded_numbers: part?.superseded_numbers.join(", ") ?? "",
    aftermarket_part_number: part?.aftermarket_part_number ?? "",
    fitment_notes: part?.fitment_notes ?? "",
    job_id: part?.job_id ?? defaultJobId ?? "",
    replaces_part_id: part?.replaces_part_id ?? "",
    vendor: part?.vendor ?? "",
    product_url: part?.product_url ?? "",
    order_number: part?.order_number ?? "",
    return_by: part?.return_by ?? "",
    warranty_notes: part?.warranty_notes ?? "",
    quantity: String(part?.quantity ?? 1),
    notes: part?.notes ?? "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<PartFormValues, unknown, PartInput>({
      resolver: zodResolver(partSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;
  const toOptions = (xs: Option[]) =>
    xs
      .filter((x) => x.id !== part?.id)
      .map((x) => ({ value: x.id, label: x.name }));

  const onSubmit = handleSubmit(async () => {
    if (part) {
      const result = await updatePart(part.id, getValues());
      if (!result.ok) return applyActionErrors(result, setError);
      return setOpen(false);
    }
    const result = await createPart(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setOpen(false);
    if (openAfterCreate) router.push(`/parts/${result.data.id}`);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{part ? "Edit part" : "Add part"}</DialogTitle>
        </DialogHeader>
        <form
          id="part-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="part-name"
            label="Name"
            className="sm:col-span-2"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextField
            id="part-brand"
            label="Brand"
            error={errors.brand?.message}
            {...register("brand")}
          />
          <SelectField
            id="part-category"
            label="Category"
            options={options(PART_CATEGORY_LABELS)}
            error={errors.category?.message}
            {...register("category")}
          />
          <SelectField
            id="part-status"
            label="Status"
            options={options(PART_STATUS_LABELS)}
            error={errors.status?.message}
            {...register("status")}
          />
          <TextField
            id="part-quantity"
            label="Quantity"
            inputMode="numeric"
            error={errors.quantity?.message}
            {...register("quantity")}
          />
          <TextField
            id="part-oem"
            label="OEM part number"
            error={errors.oem_part_number?.message}
            {...register("oem_part_number")}
          />
          <TextField
            id="part-superseded"
            label="Superseded numbers"
            hint="Separate with commas."
            error={errors.superseded_numbers?.message}
            {...register("superseded_numbers")}
          />
          <TextField
            id="part-aftermarket"
            label="Aftermarket part number"
            error={errors.aftermarket_part_number?.message}
            {...register("aftermarket_part_number")}
          />
          <SelectField
            id="part-job"
            label="Job"
            emptyLabel="None"
            hint="The job that installs (or removed) it."
            options={toOptions(jobs)}
            error={errors.job_id?.message}
            {...register("job_id")}
          />
          <SelectField
            id="part-replaces"
            label="Replaces"
            emptyLabel="None"
            hint="The stock part it removed, if tracked."
            options={toOptions(parts)}
            error={errors.replaces_part_id?.message}
            {...register("replaces_part_id")}
          />
          <TextareaField
            id="part-fitment"
            label="Fitment notes"
            rows={2}
            hint="955 vs. 957, Touareg/Q7 cross-fit."
            error={errors.fitment_notes?.message}
            {...register("fitment_notes")}
          />
          <TextField
            id="part-vendor"
            label="Vendor"
            error={errors.vendor?.message}
            {...register("vendor")}
          />
          <TextField
            id="part-url"
            label="Product link"
            inputMode="url"
            error={errors.product_url?.message}
            {...register("product_url")}
          />
          <TextField
            id="part-order"
            label="Order number"
            error={errors.order_number?.message}
            {...register("order_number")}
          />
          <TextField
            id="part-return-by"
            label="Return by"
            type="date"
            error={errors.return_by?.message}
            {...register("return_by")}
          />
          <TextareaField
            id="part-warranty"
            label="Warranty notes"
            rows={2}
            error={errors.warranty_notes?.message}
            {...register("warranty_notes")}
          />
          <TextareaField
            id="part-notes"
            label="Notes"
            rows={2}
            error={errors.notes?.message}
            {...register("notes")}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="part-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : part ? "Save part" : "Add part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
