"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Lock, MoreHorizontal } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import type { TaskLinkOptions, TaskRow } from "@/lib/db/queries/tasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskFormDialog } from "./task-form-dialog";

/** Checklist rows: tick to complete (rule 20), edit, drop, delete. */
export function TaskList({
  tasks,
  today,
  options,
  hideLinksTo,
  emptyText = "No tasks.",
  label = "Tasks",
}: {
  tasks: TaskRow[];
  today: string;
  options?: TaskLinkOptions;
  /** Omit the link chip for the record this list is shown on. */
  hideLinksTo?: string;
  emptyText?: string;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [, startTransition] = useTransition();
  // Tick immediately; the server refresh confirms it (or the change reverts on failure).
  const [shown, setShown] = useOptimistic(
    tasks,
    (state, change: { id: string; status: TaskRow["status"] }) =>
      state.map((t) =>
        t.id === change.id ? { ...t, status: change.status } : t,
      ),
  );
  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    change?: { id: string; status: TaskRow["status"] },
  ) =>
    startTransition(async () => {
      setError(null);
      if (change) setShown(change);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
    });

  if (!tasks.length)
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <ul className="divide-y rounded-lg border" aria-label={label}>
        {shown.map((t) => {
          const done = t.status !== "open";
          const overdue = !done && t.due_on !== null && t.due_on < today;
          const links = t.links.filter((l) => l.href !== hideLinksTo);
          const blocking = t.links.some((l) => l.blocks_job);
          return (
            <li key={t.id} className="flex items-start gap-3 px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={t.status === "done"}
                disabled={t.status === "dropped"}
                aria-label={
                  t.status === "done"
                    ? `Reopen ${t.title}`
                    : `Complete ${t.title}`
                }
                onChange={(e) => {
                  const status = e.target.checked ? "done" : "open";
                  run(() => setTaskStatus(t.id, status), { id: t.id, status });
                }}
              />
              <div className="min-w-0 flex-1">
                <p className={cn(done && "text-muted-foreground line-through")}>
                  {t.title}
                  {t.status === "dropped" && (
                    <span className="ml-2 text-xs no-underline">(dropped)</span>
                  )}
                </p>
                <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                  {t.due_on && (
                    <span
                      className={cn(overdue && "text-destructive font-medium")}
                    >
                      Due {formatDate(t.due_on)}
                    </span>
                  )}
                  {blocking && !done && (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <Lock className="size-3" aria-hidden /> Blocks a job
                    </span>
                  )}
                  {links.map((l) => (
                    <Link
                      key={l.href + l.label}
                      href={l.href}
                      className="hover:underline"
                    >
                      {l.label}
                    </Link>
                  ))}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`More actions for ${t.title}`}
                  >
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(t)}>
                    Edit
                  </DropdownMenuItem>
                  {t.status === "open" ? (
                    <DropdownMenuItem
                      onSelect={() => run(() => setTaskStatus(t.id, "dropped"))}
                    >
                      Drop
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={() => run(() => setTaskStatus(t.id, "open"))}
                    >
                      Reopen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <ConfirmButton
                title="Delete task"
                description={`Delete "${t.title}"?`}
                confirmLabel="Delete task"
                onConfirm={() => deleteTask(t.id)}
                trigger={
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={`Delete ${t.title}`}
                  >
                    Delete
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
      {editing && (
        <TaskFormDialog
          task={editing}
          options={options}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
