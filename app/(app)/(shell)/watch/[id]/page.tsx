import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ConfirmButton } from "@/components/confirm-button";
import { AttachmentsDialog } from "@/components/media/attachments-dialog";
import { AttachmentsPanel } from "@/components/media/attachments-panel";
import { ViewPhotosButton } from "@/components/media/view-photos-button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import {
  DueBadge,
  SeverityBadge,
  WatchStatusBadge,
} from "@/components/watch/badges";
import { CheckinDialog } from "@/components/watch/checkin-dialog";
import { CloseButtons } from "@/components/watch/close-buttons";
import { PromoteDialog } from "@/components/watch/promote-dialog";
import { SuspectedParts } from "@/components/watch/suspected-parts";
import { WatchItemFormDialog } from "@/components/watch/watch-item-form-dialog";
import { deleteWatchItem } from "@/lib/actions/watch";
import { requireVehicle } from "@/lib/auth";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { getTaskLinkOptions, getTasksFor } from "@/lib/db/queries/tasks";
import { getWatchItem } from "@/lib/db/queries/watch";
import { todayIso } from "@/lib/domain/dates";
import { formatDate, formatMiles } from "@/lib/format";
import { WATCH_SYSTEM_LABELS } from "@/lib/labels";

export async function generateMetadata({
  params,
}: PageProps<"/watch/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Watch item" };
  return { title: (await getWatchItem(id))?.item.title ?? "Watch item" };
}

export default async function WatchItemPage({
  params,
}: PageProps<"/watch/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, vehicle, phases, tasks, taskOptions] = await Promise.all([
    getWatchItem(id),
    requireVehicle(),
    getPhaseOptions(),
    getTasksFor("watch_item", id),
    getTaskLinkOptions(),
  ]);
  if (!data) notFound();
  const { item } = data;
  const today = todayIso();
  const watching = item.status === "watching";

  async function remove() {
    "use server";
    const result = await deleteWatchItem(id);
    if (result.ok) redirect("/watch");
    return result;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            <Link href="/watch" className="hover:underline">
              Watch list
            </Link>{" "}
            / {WATCH_SYSTEM_LABELS[item.system]}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {item.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <WatchStatusBadge status={item.status} />
            <SeverityBadge severity={item.severity} />
            <DueBadge due={data.isDue} overdue={data.isOverdue} />
          </div>
        </div>
        <div className="flex gap-1">
          <WatchItemFormDialog
            item={item}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <ConfirmButton
            title="Delete watch item"
            description={`Delete "${item.title}" and its check-ins?`}
            confirmLabel="Delete"
            onConfirm={remove}
            trigger={<Button variant="ghost">Delete</Button>}
          />
        </div>
      </header>

      <section
        aria-label="Follow-up and actions"
        className="flex flex-col gap-3 rounded-xl border p-4"
      >
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">Next follow-up</dt>
            <dd>
              {item.next_followup_on || item.next_followup_odometer !== null
                ? [
                    item.next_followup_on && formatDate(item.next_followup_on),
                    item.next_followup_odometer !== null &&
                      `at ${formatMiles(item.next_followup_odometer)}`,
                  ]
                    .filter(Boolean)
                    .join(" or ")
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Odometer now</dt>
            <dd>{formatMiles(vehicle.current_odometer)}</dd>
          </div>
          {item.closed_on && (
            <div>
              <dt className="text-muted-foreground text-xs">Closed</dt>
              <dd>{formatDate(item.closed_on)}</dd>
            </div>
          )}
          {data.promotedJob && (
            <div>
              <dt className="text-muted-foreground text-xs">Promoted to</dt>
              <dd>
                <Link
                  href={`/jobs/${data.promotedJob.id}`}
                  className="underline"
                >
                  {data.promotedJob.title}
                </Link>
              </dd>
            </div>
          )}
        </dl>
        {item.description && (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <CheckinDialog
            item={item}
            today={today}
            currentOdometer={vehicle.current_odometer}
            phases={phases}
            trigger={
              <Button variant={data.isDue ? "default" : "outline"}>
                Check in
              </Button>
            }
          />
          {watching && (
            <PromoteDialog
              item={item}
              phases={phases}
              trigger={<Button variant="outline">Promote to job</Button>}
            />
          )}
          <CloseButtons itemId={item.id} status={item.status} />
          <ViewPhotosButton
            scope={{ kind: "watch_item", id: item.id }}
            size="default"
          />
        </div>
      </section>

      <section
        aria-labelledby="checkins-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="checkins-heading" className="mb-3 font-semibold">
          Check-ins
        </h2>
        {data.checkins.length === 0 ? (
          <p className="text-muted-foreground text-sm">No check-ins yet.</p>
        ) : (
          <ol className="flex flex-col gap-4" aria-label="Check-in history">
            {data.checkins.map((c) => (
              <li key={c.id} className="border-l-2 pl-3">
                <p className="text-sm font-medium">
                  {formatDate(c.checked_on)}
                  {c.odometer !== null && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {formatMiles(c.odometer)}
                    </span>
                  )}
                </p>
                {c.observation && (
                  <p className="text-sm whitespace-pre-wrap">{c.observation}</p>
                )}
                <div className="mt-2">
                  <AttachmentsDialog
                    parent={{ kind: "watch_checkin", id: c.id }}
                    title={`Check-in ${formatDate(c.checked_on)}`}
                    uploadLabel="Add clip or photo"
                    trigger={
                      <Button variant="ghost" size="xs">
                        {c.media.length
                          ? `${c.media.length} file${c.media.length === 1 ? "" : "s"}`
                          : "Add clip or photo"}
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="suspects-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="suspects-heading" className="mb-3 font-semibold">
          Suspected parts
        </h2>
        <SuspectedParts
          itemId={item.id}
          parts={data.suspectedParts}
          candidates={data.partCandidates}
        />
      </section>

      <section
        aria-labelledby="watch-tasks-heading"
        className="rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="watch-tasks-heading" className="font-semibold">
            Tasks
          </h2>
          <TaskFormDialog
            preset={{ kind: "watch_item", id: item.id }}
            options={taskOptions}
            trigger={
              <Button variant="outline" size="sm">
                Add task
              </Button>
            }
          />
        </div>
        <TaskList
          tasks={tasks}
          today={today}
          options={taskOptions}
          hideLinksTo={`/watch/${item.id}`}
          emptyText="No tasks linked."
        />
      </section>

      <section
        aria-labelledby="watch-files-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="watch-files-heading" className="mb-3 font-semibold">
          Photos and files
        </h2>
        <AttachmentsPanel
          parent={{ kind: "watch_item", id: item.id }}
          items={data.itemMedia}
        />
      </section>
    </div>
  );
}
