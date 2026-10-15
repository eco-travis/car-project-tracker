import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { z } from "zod";
import { controlClass } from "@/components/form/field";
import { LogWorkDialog } from "@/components/jobs/log-work-dialog";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireVehicle } from "@/lib/auth";
import { getWorkLog } from "@/lib/db/queries/jobs";
import { todayIso } from "@/lib/domain/dates";
import { completionDefaults } from "@/lib/domain/jobs";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { formatDate, formatMiles } from "@/lib/format";
import { JOB_TYPE_LABELS, PERFORMED_BY_LABELS, options } from "@/lib/labels";
import { JOB_TYPES } from "@/lib/schemas/job";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Work Log" };

const filtersSchema = z.object({
  type: z.enum(JOB_TYPES).optional().catch(undefined),
  phase: z
    .union([z.uuid(), z.literal("none")])
    .optional()
    .catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
});

export default async function WorkLogPage({ searchParams }: PageProps<"/log">) {
  const raw = await searchParams;
  const filters = filtersSchema.parse({
    type: first(raw.type) || undefined,
    phase: first(raw.phase) || undefined,
    q: first(raw.q) || undefined,
  });
  const [entries, phases, vehicle] = await Promise.all([
    getWorkLog(filters),
    getPhaseOptions(),
    requireVehicle(),
  ]);
  const filtered = Boolean(filters.type || filters.phase || filters.q);

  return (
    <>
      <PageHeader
        title="Work Log"
        description="What has been done, when, at what mileage?"
        actions={
          <LogWorkDialog
            phases={phases}
            defaults={completionDefaults(todayIso(), vehicle.current_odometer)}
          />
        }
      />
      <Form
        key={JSON.stringify(filters)}
        action="/log"
        role="search"
        aria-label="Filter work log"
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="log-q" className="text-xs font-medium">
            Search
          </label>
          <Input
            id="log-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Title, description, notes"
          />
        </div>
        <FilterSelect
          id="log-type"
          name="type"
          label="Type"
          value={filters.type}
          options={options(JOB_TYPE_LABELS)}
        />
        <FilterSelect
          id="log-phase"
          name="phase"
          label="Phase"
          value={filters.phase}
          options={[
            { value: "none", label: "No phase" },
            ...phases.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/log">Clear</Link>
          </Button>
        )}
      </Form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {filtered
            ? "No done jobs match these filters."
            : "No done jobs yet. Use Log work, or mark a job done, and it shows up here."}
        </p>
      ) : (
        <ol
          className="divide-y rounded-xl border"
          aria-label="Done jobs, newest first"
        >
          {entries.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[7rem_7rem_1fr_auto]"
            >
              <span className="text-sm tabular-nums">
                {formatDate(e.completed_on)}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums sm:order-none">
                {formatMiles(e.completed_odometer)}
              </span>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <Link
                  href={`/jobs/${e.id}`}
                  className="font-medium hover:underline"
                >
                  {e.title}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {JOB_TYPE_LABELS[e.type]}
                  {e.phase && ` · ${e.phase.name}`}
                </p>
              </div>
              <span className="text-muted-foreground col-span-2 text-xs sm:col-span-1 sm:text-right">
                {e.performed_by && PERFORMED_BY_LABELS[e.performed_by]}
                {e.performer_name && ` · ${e.performer_name}`}
                {e.diy_hours !== null && ` · ${e.diy_hours} h`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function FilterSelect({
  id,
  name,
  label,
  value,
  options,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value ?? ""}
        className={cn(controlClass, "h-8 w-44")}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
