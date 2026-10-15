"use client";

import { ClientTrigger } from "@/components/client-trigger";
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
import { createTool, updateTool } from "@/lib/actions/tools";
import { TOOL_STATUS_LABELS, options } from "@/lib/labels";
import {
  newToolSchema,
  type ToolFormValues,
  type ToolInput,
} from "@/lib/schemas/tool";

export type EditableTool = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  status: ToolFormValues["status"];
  bought_for_project: boolean;
  notes: string | null;
};

/** Create or edit a tool. With `jobId`, a new tool is also linked to that job. */
export function ToolFormDialog({
  tool,
  jobId,
  trigger,
}: {
  tool?: EditableTool;
  jobId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const defaults: ToolFormValues = {
    name: tool?.name ?? "",
    brand: tool?.brand ?? "",
    description: tool?.description ?? "",
    status: tool?.status ?? "owned",
    bought_for_project: tool?.bought_for_project ?? false,
    cost_cents: "",
    notes: tool?.notes ?? "",
  };
  const { register, handleSubmit, getValues, setError, reset, formState } =
    useForm<ToolFormValues, unknown, ToolInput>({
      resolver: zodResolver(newToolSchema),
      defaultValues: defaults,
    });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = tool
      ? await updateTool(tool.id, getValues())
      : await createTool(getValues(), jobId);
    if (!result.ok) return applyActionErrors(result, setError);
    setOpen(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit tool" : "Add tool"}</DialogTitle>
        </DialogHeader>
        <form
          id="tool-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="tool-name"
            label="Name"
            placeholder="27mm triple-square socket"
            className="sm:col-span-2"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextField
            id="tool-brand"
            label="Brand"
            error={errors.brand?.message}
            {...register("brand")}
          />
          <SelectField
            id="tool-status"
            label="Status"
            options={options(TOOL_STATUS_LABELS)}
            error={errors.status?.message}
            {...register("status")}
          />
          {!tool && (
            <TextField
              id="tool-cost"
              label="Cost (optional)"
              inputMode="decimal"
              placeholder="0.00"
              hint="Adds a paid tool expense dated today."
              error={errors.cost_cents?.message}
              {...register("cost_cents")}
            />
          )}
          <label
            htmlFor="tool-bought"
            className="flex items-center gap-2 self-end pb-2 text-sm"
          >
            <input
              id="tool-bought"
              type="checkbox"
              className="size-4 accent-current"
              {...register("bought_for_project")}
            />
            Bought for this project
          </label>
          <TextareaField
            id="tool-description"
            label="Description"
            rows={2}
            className="sm:col-span-2"
            error={errors.description?.message}
            {...register("description")}
          />
          <TextareaField
            id="tool-notes"
            label="Notes"
            rows={2}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="tool-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : tool ? "Save tool" : "Add tool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
