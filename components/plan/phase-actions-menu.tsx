"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { AttachmentsDialog } from "@/components/media/attachments-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LinkOptions } from "@/lib/db/queries/options";
import type { PlanPhase } from "@/lib/db/queries/plan";
import { DeletePhaseButton } from "./delete-phase-button";
import { PhaseFormDialog } from "./phase-form-dialog";

type Action = "task" | "files" | "expense" | "edit" | "delete";

/**
 * Secondary phase actions in one menu; each opens its dialog in controlled mode.
 *
 * The dialogs stay mounted (`open={action === x}`) so Radix can finish closing and remove its
 * focus guards. Unmounting a dialog mid-close left the guards behind, and the next menu open
 * closed immediately. A new key per opening still gives each dialog fresh state.
 */
export function PhaseActionsMenu({
  phase,
  links,
  today,
}: {
  phase: PlanPhase;
  links: LinkOptions;
  today: string;
}) {
  const [{ action, n }, setState] = useState<{
    action: Action | null;
    n: number;
  }>({ action: null, n: 0 });
  const openAction = (a: Action) =>
    setState((s) => ({ action: a, n: s.n + 1 }));
  const close = (open: boolean) => {
    if (!open) setState((s) => ({ ...s, action: null }));
  };
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`More actions for ${phase.name}`}
          >
            <MoreHorizontal aria-hidden /> More
          </Button>
        </DropdownMenuTrigger>
        {/* No collision flipping: near the viewport edge it can oscillate and never settle. */}
        <DropdownMenuContent align="end" avoidCollisions={false}>
          <DropdownMenuItem onSelect={() => openAction("task")}>
            Add task
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openAction("expense")}>
            Add expense
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openAction("files")}>
            Files
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openAction("edit")}>
            Edit phase
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => openAction("delete")}
          >
            Delete phase
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TaskFormDialog
        key={`task-${n}`}
        preset={{ kind: "phase", id: phase.id }}
        open={action === "task"}
        onOpenChange={close}
      />
      <ExpenseFormDialog
        key={`expense-${n}`}
        options={links}
        today={today}
        title={`Add expense to ${phase.name}`}
        preset={{ phase_id: phase.id }}
        open={action === "expense"}
        onOpenChange={close}
      />
      <AttachmentsDialog
        key={`files-${n}`}
        parent={{ kind: "phase", id: phase.id }}
        title={`Files for ${phase.name}`}
        description="Phase-level photos and documents. Job photos live on each job."
        open={action === "files"}
        onOpenChange={close}
      />
      <PhaseFormDialog
        key={`edit-${n}`}
        phase={phase}
        open={action === "edit"}
        onOpenChange={close}
      />
      <DeletePhaseButton
        key={`delete-${n}`}
        id={phase.id}
        name={phase.name}
        jobCount={phase.jobs.length}
        open={action === "delete"}
        onOpenChange={close}
      />
    </>
  );
}
