import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { z } from "zod";
import { CompletionDialog } from "@/components/jobs/completion-dialog";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { DependenciesPanel } from "@/components/jobs/dependencies-panel";
import { StatusControl } from "@/components/jobs/status-control";
import { CostSummary } from "@/components/cost-summary";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import { JobPartsPanel } from "@/components/jobs/job-parts-panel";
import { AttachmentsPanel } from "@/components/media/attachments-panel";
import { ViewPhotosButton } from "@/components/media/view-photos-button";
import { JobToolsPanel } from "@/components/jobs/job-tools-panel";
import { JobFormDialog } from "@/components/plan/job-form-dialog";
import { Button } from "@/components/ui/button";
import { requireVehicle } from "@/lib/auth";
import { getJob } from "@/lib/db/queries/jobs";
import { getAttachmentsFor } from "@/lib/db/queries/media";
import { getLinkOptions } from "@/lib/db/queries/options";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { formatHours } from "@/lib/domain/costs";
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
  const [data, phases, vehicle, links, media] = await Promise.all([
    getJob(id),
    getPhaseOptions(),
    requireVehicle(),
    getLinkOptions(),
    getAttachmentsFor({ kind: "job", id }),
  ]);
  if (!data) notFound();
  const { job } = data;
  const today = todayIso();
  const defaults = completionDefaults(today, vehicle.current_odometer);

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

      <section
        aria-labelledby="job-photos-heading"
        className="rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="job-photos-heading" className="font-semibold">
            Photos and files
          </h2>
          <ViewPhotosButton scope={{ kind: "job", id: job.id }} />
        </div>
        <AttachmentsPanel parent={{ kind: "job", id: job.id }} items={media} />
      </section>
      <section
        aria-labelledby="costs-heading"
        className="rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="costs-heading" className="font-semibold">
            Costs
          </h2>
          <ExpenseFormDialog
            options={links}
            today={today}
            preset={{ job_id: job.id }}
            trigger={
              <Button variant="outline" size="sm">
                <Plus aria-hidden /> Add expense
              </Button>
            }
          />
        </div>
        <CostSummary costs={data.costs} />
        {job.diy_hours !== null && (
          <p className="text-muted-foreground mt-2 text-sm">
            DIY labor: {formatHours(job.diy_hours)} (not counted as money)
          </p>
        )}
        <div className="mt-4">
          <ExpenseList
            expenses={data.expenses}
            options={links}
            today={today}
            hide={["job"]}
          />
        </div>
      </section>

      <section
        aria-labelledby="parts-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="parts-heading" className="mb-3 font-semibold">
          Parts
        </h2>
        <JobPartsPanel
          jobId={job.id}
          parts={data.parts}
          candidates={data.partCandidates}
          jobs={links.jobs}
          allParts={links.parts}
        />
      </section>

      <section
        aria-labelledby="tools-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="tools-heading" className="mb-3 font-semibold">
          Tools needed
        </h2>
        <JobToolsPanel
          jobId={job.id}
          tools={data.tools}
          candidates={data.toolCandidates}
        />
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
