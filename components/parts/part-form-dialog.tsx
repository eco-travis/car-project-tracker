"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react";
import { ClientTrigger } from "@/components/client-trigger";
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
import type { Database } from "@/lib/db/types";
import {
  PART_CATEGORY_LABELS,
  PART_STATUS_LABELS,
  options,
} from "@/lib/labels";
import {
  newPartSchema,
  type PartFormValues,
  type PartInput,
} from "@/lib/schemas/part";
import { uploadFile } from "@/lib/upload/client";

type Part = Database["public"]["Tables"]["parts"]["Row"];

/** Receipts and invoices: photos or PDFs, filed as kind "receipt". */
const RECEIPT_TYPES = "image/*,application/pdf";

/**
 * Add part: name, category, status, quantity, OEM number, web link, vendor, notes, and an optional
 * receipt or invoice.
 * Edit part: the same essentials, with the rest of the spec's part fields under "More details"
 * (kept so existing data stays editable). A job is still linked when adding from a job's page.
 */
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
  const [receipt, setReceipt] = useState<File | null>(null);
  const receiptInput = useRef<HTMLInputElement>(null);
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
    cost_cents: "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<PartFormValues, unknown, PartInput>({
      resolver: zodResolver(newPartSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;
  const moreDetailsError = (
    [
      "brand",
      "fitment_notes",
      "superseded_numbers",
      "aftermarket_part_number",
      "job_id",
      "replaces_part_id",
      "order_number",
      "return_by",
      "warranty_notes",
    ] as const
  ).some((f) => errors[f]);
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
    if (receipt) {
      const upload = await uploadFile(receipt, {
        parent: { kind: "part", id: result.data.id },
        receipt: true,
      });
      if (!upload.ok) {
        // The part exists; say so rather than failing silently, and let them retry from its page.
        setError("root", {
          message: `Part saved, but the receipt didn't upload: ${upload.error}`,
        });
        router.refresh();
        return;
      }
    }
    setOpen(false);
    if (openAfterCreate) router.push(`/parts/${result.data.id}`);
    else router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaults);
          setReceipt(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
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
          {!part && (
            <TextField
              id="part-cost"
              label="Cost (optional)"
              inputMode="decimal"
              placeholder="0.00"
              hint="Adds a paid expense dated today."
              error={errors.cost_cents?.message}
              {...register("cost_cents")}
            />
          )}
          <TextField
            id="part-oem"
            label="OEM part number"
            error={errors.oem_part_number?.message}
            {...register("oem_part_number")}
          />
          <TextField
            id="part-url"
            label="Web link"
            inputMode="url"
            placeholder="https://"
            error={errors.product_url?.message}
            {...register("product_url")}
          />
          <TextField
            id="part-vendor"
            label="Vendor"
            error={errors.vendor?.message}
            {...register("vendor")}
          />
          <TextareaField
            id="part-notes"
            label="Notes"
            rows={2}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />

          {!part && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium">
                Receipt or invoice (optional)
              </span>
              <input
                ref={receiptInput}
                type="file"
                accept={RECEIPT_TYPES}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
              {receipt ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Paperclip className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {receipt.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove receipt"
                    onClick={() => {
                      setReceipt(null);
                      if (receiptInput.current) receiptInput.current.value = "";
                    }}
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => receiptInput.current?.click()}
                >
                  <Paperclip aria-hidden /> Attach receipt or invoice
                </Button>
              )}
              <p className="text-muted-foreground text-xs">
                A photo or PDF. It&apos;s saved on the part and kept out of the
                Gallery.
              </p>
            </div>
          )}

          {part && (
            // Opens itself when one of its fields has an error, so the message is visible.
            <details
              open={moreDetailsError || undefined}
              className="rounded-lg border p-3 sm:col-span-2"
            >
              <summary className="cursor-pointer text-sm font-medium">
                More details
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  id="part-brand"
                  label="Brand"
                  error={errors.brand?.message}
                  {...register("brand")}
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
              </div>
            </details>
          )}
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
