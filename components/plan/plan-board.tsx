"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { CostSummary } from "@/components/cost-summary";
import { ViewPhotosButton } from "@/components/media/view-photos-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reorderPhases } from "@/lib/actions/phases";
import type { LinkOptions } from "@/lib/db/queries/options";
import type { PlanJob, PlanPhase } from "@/lib/db/queries/plan";
import { formatHours } from "@/lib/domain/costs";
import { reorderIds } from "@/lib/domain/phases";
import { formatDate } from "@/lib/format";
import { PHASE_STATUS_LABELS } from "@/lib/labels";
import { JobFormDialog } from "./job-form-dialog";
import { JobRow, visibleBlockers } from "./job-row";
import { PhaseActionsMenu } from "./phase-actions-menu";

type PhaseOption = { id: string; name: string };

const screenReaderInstructions = {
  draggable:
    "To reorder a phase, press Space or Enter to pick it up, use the arrow keys to move it, then press Space or Enter to drop it. Press Escape to cancel.",
};

export function PlanBoard({
  phases,
  unphased,
  links,
  today,
}: {
  phases: PlanPhase[];
  unphased: PlanJob[];
  links: LinkOptions;
  today: string;
}) {
  // Optimistic order while a reorder saves; reverts to server order if it fails.
  const [order, setOrder] = useOptimistic(phases.map((p) => p.id));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const byId = new Map(phases.map((p) => [p.id, p]));
  const phaseOptions: PhaseOption[] = order.map((id) => ({
    id,
    name: byId.get(id)?.name ?? "",
  }));

  // Screen-reader announcements with phase names instead of ids.
  const nameOf = (id: UniqueIdentifier) =>
    byId.get(String(id))?.name ?? "Phase";
  const positionOf = (id: UniqueIdentifier) =>
    `position ${order.indexOf(String(id)) + 1} of ${order.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)} at ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${positionOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} was dropped at ${positionOf(over.id)}.`
        : `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${nameOf(active.id)} is back at ${positionOf(active.id)}.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = reorderIds(
      order,
      order.indexOf(String(active.id)),
      order.indexOf(String(over.id)),
    );
    setError(null);
    startTransition(async () => {
      setOrder(next);
      const result = await reorderPhases(next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <DndContext
        // Stable id: dnd-kit's generated ids come from a module-level counter that drifts
        // between server and client, causing hydration mismatches.
        id="plan-phases"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.length === 0 && (
            <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              No phases. Add one to group jobs and track a budget.
            </p>
          )}
          <ol className="flex flex-col gap-4" aria-label="Phases">
            {order.map((id, index) => {
              const phase = byId.get(id);
              return phase ? (
                <SortablePhase
                  key={id}
                  phase={phase}
                  position={index + 1}
                  phaseOptions={phaseOptions}
                  links={links}
                  today={today}
                />
              ) : null;
            })}
          </ol>
        </SortableContext>
      </DndContext>

      <section aria-labelledby="unphased-heading" className="rounded-xl border">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 id="unphased-heading" className="font-semibold">
              Unphased
            </h2>
            <p className="text-muted-foreground text-xs">
              Routine maintenance and anything not tied to a phase.
            </p>
          </div>
          <JobFormDialog
            phases={phaseOptions}
            defaultPhaseId={null}
            trigger={
              <Button variant="outline" size="sm">
                <Plus aria-hidden /> Add job
              </Button>
            }
          />
        </header>
        <JobList jobs={unphased} />
      </section>
    </div>
  );
}

function SortablePhase({
  phase,
  position,
  phaseOptions,
  links,
  today,
}: {
  phase: PlanPhase;
  position: number;
  phaseOptions: PhaseOption[];
  links: LinkOptions;
  today: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: phase.id,
  });
  const missing = whatsMissing(phase.jobs);
  const headingId = `phase-${phase.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-80" : undefined}
    >
      <section
        aria-labelledby={headingId}
        className="bg-card rounded-xl border"
      >
        <header className="flex flex-wrap items-start gap-3 border-b px-4 py-3">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${phase.name}`}
            className="text-muted-foreground hover:bg-muted mt-0.5 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={headingId} className="font-semibold">
                <span className="text-muted-foreground">{position}.</span>{" "}
                {phase.name}
              </h2>
              <Badge variant="outline">
                {PHASE_STATUS_LABELS[phase.status]}
              </Badge>
            </div>
            <dl className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {(phase.target_start || phase.target_end) && (
                <div className="flex gap-1">
                  <dt>Target</dt>
                  <dd>
                    {formatDate(phase.target_start) || "?"} –{" "}
                    {formatDate(phase.target_end) || "?"}
                  </dd>
                </div>
              )}
              <div className="flex gap-1">
                <dt>Jobs</dt>
                <dd>{phase.jobs.length}</dd>
              </div>
              {phase.diyHours > 0 && (
                <div className="flex gap-1">
                  <dt>DIY</dt>
                  <dd>{formatHours(phase.diyHours)}</dd>
                </div>
              )}
            </dl>
            <CostSummary costs={phase.costs} compact className="mt-1" />
            {missing.length > 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Missing: {missing.join(" · ")}
              </p>
            )}
            {phase.description && (
              <p className="text-muted-foreground mt-2 text-sm">
                {phase.description}
              </p>
            )}
          </div>
          {/* Own row on phones so the phase name keeps the full width. */}
          <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
            <JobFormDialog
              phases={phaseOptions}
              defaultPhaseId={phase.id}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Add job to ${phase.name}`}
                >
                  <Plus aria-hidden /> Add job
                </Button>
              }
            />
            <ViewPhotosButton
              scope={{ kind: "phase", id: phase.id }}
              label="Photos"
            />
            <PhaseActionsMenu phase={phase} links={links} today={today} />
          </div>
        </header>
        <JobList jobs={phase.jobs} />
      </section>
    </li>
  );
}

/** Flow 5: what the phase still needs before its jobs can go ahead. */
function whatsMissing(jobs: PlanJob[]): string[] {
  const open = jobs.filter(
    (j) => j.status !== "done" && j.status !== "cancelled",
  );
  const parts = new Set(
    open.flatMap((j) => j.partsNotOrdered.map((p) => p.id)),
  );
  const tools = new Set(open.flatMap((j) => j.toolsToBuy.map((t) => t.id)));
  const blocked = open.filter((j) => visibleBlockers(j).length > 0).length;
  const blockingTasks = new Set(
    open.flatMap((j) =>
      j.blockers.filter((b) => b.kind === "task").map((b) => b.id),
    ),
  );
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? `1 ${one}` : `${n} ${many}`;
  return [
    parts.size && `${plural(parts.size, "part", "parts")} not ordered`,
    tools.size && `${plural(tools.size, "tool", "tools")} to buy`,
    blockingTasks.size &&
      `${plural(blockingTasks.size, "blocking task", "blocking tasks")} open`,
    blocked && `${plural(blocked, "job is", "jobs are")} blocked`,
  ].filter(Boolean) as string[];
}

function JobList({ jobs }: { jobs: PlanJob[] }) {
  if (!jobs.length)
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm">No jobs yet.</p>
    );
  return (
    <ul className="divide-y">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </ul>
  );
}
