"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { applyActionErrors } from "@/components/form/apply-errors";
import { controlClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
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
import {
  createTask,
  loadTaskLinkOptions,
  updateTask,
} from "@/lib/actions/tasks";
import type { TaskLinkOptions, TaskRow } from "@/lib/db/queries/tasks";
import {
  taskSchema,
  type TaskFormValues,
  type TaskInput,
} from "@/lib/schemas/task";
import { cn } from "@/lib/utils";

type LinkKind = "job" | "part" | "phase" | "watch_item";
type FormLink = TaskFormValues["links"][number];

const EMPTY_LINK = {
  job_id: null,
  part_id: null,
  phase_id: null,
  watch_item_id: null,
  blocks_job: false,
};

function linkOf(kind: LinkKind, id: string, blocks = false): FormLink {
  return {
    ...EMPTY_LINK,
    [`${kind}_id`]: id,
    blocks_job: kind === "job" && blocks,
  };
}

/**
 * Flow 9: add or edit a task. `preset` pre-links it to the record it was added from; on a job,
 * the "blocks this job" toggle sits right on that link.
 */
export function TaskFormDialog({
  task,
  preset,
  options: initialOptions,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: {
  task?: TaskRow;
  preset?: { kind: LinkKind; id: string; blocks?: boolean };
  options?: TaskLinkOptions;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [options, setOptions] = useState<TaskLinkOptions | undefined>(
    initialOptions,
  );
  // Opened programmatically (quick-add) skips onOpenChange, so load pickers whenever open without them.
  useEffect(() => {
    if (open && !options) loadTaskLinkOptions().then(setOptions);
  }, [open, options]);
  const [addKind, setAddKind] = useState<LinkKind>("job");
  const [addId, setAddId] = useState("");

  const defaults: TaskFormValues = {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    due_on: task?.due_on ?? "",
    links: task
      ? task.links.map(
          ({ job_id, part_id, phase_id, watch_item_id, blocks_job }) => ({
            job_id,
            part_id,
            phase_id,
            watch_item_id,
            blocks_job,
          }),
        )
      : preset
        ? [linkOf(preset.kind, preset.id, preset.blocks)]
        : [],
  };
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState,
  } = useForm<TaskFormValues, unknown, TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "links" });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async () => {
    const result = task
      ? await updateTask(task.id, getValues())
      : await createTask(getValues());
    if (!result.ok) return applyActionErrors(result, setError);
    setOpen(false);
    onSaved?.();
  });

  const nameFor = (l: FormLink) => {
    const find = (
      xs: { id: string; name: string }[] | undefined,
      id: string | null | undefined,
    ) => xs?.find((x) => x.id === id)?.name;
    if (l.job_id)
      return `Job: ${find(options?.jobs, l.job_id) ?? task?.links.find((x) => x.job_id === l.job_id)?.label.slice(5) ?? "…"}`;
    if (l.part_id) return `Part: ${find(options?.parts, l.part_id) ?? "…"}`;
    if (l.phase_id) return `Phase: ${find(options?.phases, l.phase_id) ?? "…"}`;
    return `Watch: ${find(options?.watchItems, l.watch_item_id) ?? "…"}`;
  };
  const pickList =
    {
      job: options?.jobs,
      part: options?.parts,
      phase: options?.phases,
      watch_item: options?.watchItems,
    }[addKind] ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaults);
          setAddId("");
        }
      }}
    >
      {trigger && (
        <DialogTrigger asChild>
          <ClientTrigger>{trigger}</ClientTrigger>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle>
        </DialogHeader>
        <form
          id="task-form"
          onSubmit={onSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField
            id="task-title"
            label="Task"
            placeholder="Book bay at DIY garage for lift install"
            className="sm:col-span-2"
            error={errors.title?.message}
            {...register("title")}
          />
          <TextField
            id="task-due"
            label="Due date (optional)"
            type="date"
            error={errors.due_on?.message}
            {...register("due_on")}
          />
          <TextareaField
            id="task-notes"
            label="Notes"
            rows={2}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />

          <fieldset className="flex flex-col gap-2 rounded-lg border p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Linked to</legend>
            {fields.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Optional: a job, part, phase, or watch item.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {fields.map((f, i) => (
                <li
                  key={f.id}
                  className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{nameFor(f)}</span>
                  {f.job_id && (
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="size-4"
                        {...register(`links.${i}.blocks_job`)}
                      />
                      Blocks this job
                    </label>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove link ${nameFor(f)}`}
                    onClick={() => remove(i)}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end gap-2">
              <select
                aria-label="Link type"
                value={addKind}
                onChange={(e) => {
                  setAddKind(e.target.value as LinkKind);
                  setAddId("");
                }}
                className={cn(controlClass, "h-8 w-32")}
              >
                <option value="job">Job</option>
                <option value="part">Part</option>
                <option value="phase">Phase</option>
                <option value="watch_item">Watch item</option>
              </select>
              <select
                aria-label="Record to link"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                className={cn(controlClass, "h-8 min-w-40 flex-1")}
                disabled={!options}
              >
                <option value="">{options ? "Choose…" : "Loading…"}</option>
                {pickList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!addId}
                onClick={() => {
                  const key = `${addKind}_id` as const;
                  if (!getValues("links").some((l) => l[key] === addId))
                    append(linkOf(addKind, addId));
                  setAddId("");
                }}
              >
                Link
              </Button>
            </div>
            {errors.links && (
              <p role="alert" className="text-destructive text-sm">
                {errors.links.message ??
                  errors.links.root?.message ??
                  "Check the links."}
              </p>
            )}
          </fieldset>
          <FormError
            message={errors.root?.message}
            className="text-destructive text-sm sm:col-span-2"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="task-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : task ? "Save task" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
