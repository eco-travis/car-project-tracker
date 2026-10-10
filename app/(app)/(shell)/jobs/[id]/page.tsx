import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CompletionDialog } from "@/components/jobs/completion-dialog";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { DependenciesPanel } from "@/components/jobs/dependencies-panel";
import { StatusControl } from "@/components/jobs/status-control";
import { Money } from "@/components/money";
import { JobFormDialog } from "@/components/plan/job-form-dialog";
import { Button } from "@/components/ui/button";
import { requireVehicle } from "@/lib/auth";
import { getJob } from "@/lib/db/queries/jobs";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { todayIso } from "@/lib/domain/dates";
import { completionDefaults } from "@/lib/domain/jobs";
import { formatDate, formatMiles } from "@/lib/format";
import { JOB_TYPE_LABELS, PERFORMED_BY_LABELS } from "@/lib/labels";

export async function generateMetadata({
  params,
}: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Job" };
  const data = await getJob(id);
  return { title: data?.job.title ?? "Job" };
}

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, phases, vehicle] = await Promise.all([
    getJob(id),
    getPhaseOptions(),
    requireVehicle(),
  ]);
  if (!data) notFound();
  const { job } = data;
  const defaults = completionDefaults(todayIso(), vehicle.current_odometer);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            <Link href="/plan" className="hover:underline">
              Plan
            </Link>
            {job.phase && <> / {job.phase.name}</>}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground text-sm">
            {JOB_TYPE_LABELS[job.type]}
          </p>
        </div>
        <div className="flex gap-1">
          <JobFormDialog
            job={job}
            phases={phases}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <DeleteJobButton id={job.id} title={job.title} />
        </div>
      </header>

      <section
        aria-label="Status and completion"
        className="rounded-xl border p-4"
      >
        <StatusControl
          job={job}
          openBlockers={data.openBlockers}
          completionDefaults={defaults}
        />
        {job.status === "done" && (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t pt-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <Detail label="Completed">{formatDate(job.completed_on)}</Detail>
              <Detail label="Odometer">
                {formatMiles(job.completed_odometer)}
              </Detail>
              <Detail label="Performed by">
                {job.performed_by
                  ? `${PERFORMED_BY_LABELS[job.performed_by]}${job.performer_name ? ` · ${job.performer_name}` : ""}`
                  : "—"}
              </Detail>
              <Detail label="DIY hours">{job.diy_hours ?? "—"}</Detail>
            </dl>
            <CompletionDialog
              job={job}
              defaults={defaults}
              trigger={
                <Button variant="ghost" size="sm">
                  Edit completion
                </Button>
              }
            />
          </div>
        )}
      </section>

      <section aria-labelledby="deps-heading" className="rounded-xl border p-4">
        <h2 id="deps-heading" className="mb-3 font-semibold">
          Dependencies
        </h2>
        <DependenciesPanel
          jobId={job.id}
          blockedBy={data.blockedBy}
          blocks={data.blocks}
          blockingTasks={data.blockingTasks}
          candidates={data.dependencyCandidates}
        />
      </section>

      <section
        aria-labelledby="details-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="details-heading" className="mb-3 font-semibold">
          Details
        </h2>
        <dl className="flex flex-col gap-3 text-sm">
          {job.budget_cents !== null && (
            <Detail label="Budget">
              <Money cents={job.budget_cents} />
            </Detail>
          )}
          <Detail label="Description">{job.description ?? "—"}</Detail>
          <Detail label="Notes">
            <span className="whitespace-pre-wrap">{job.notes ?? "—"}</span>
          </Detail>
          <Detail label="Links">
            {job.links.length ? (
              <ul className="flex flex-col gap-1">
                {job.links.map((link) => (
                  <li key={link}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </Detail>
        </dl>
      </section>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
