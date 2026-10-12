import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CheckinDialog } from "@/components/watch/checkin-dialog";
import {
  DueBadge,
  SeverityBadge,
  WatchStatusBadge,
} from "@/components/watch/badges";
import { NewWatchItemButton } from "@/components/watch/new-watch-item-button";
import { PromoteDialog } from "@/components/watch/promote-dialog";
import { requireVehicle } from "@/lib/auth";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { getWatchList } from "@/lib/db/queries/watch";
import { todayIso } from "@/lib/domain/dates";
import { sortWatchList } from "@/lib/domain/watch";
import { formatDate, formatMiles } from "@/lib/format";
import { WATCH_SYSTEM_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Watch list" };

export default async function WatchListPage() {
  const [vehicle, items, phases] = await Promise.all([
    requireVehicle(),
    getWatchList(),
    getPhaseOptions(),
  ]);
  const today = todayIso();
  const watching = sortWatchList(
    items.filter((i) => i.status === "watching"),
    today,
    vehicle.current_odometer,
  );
  const closed = items
    .filter((i) => i.status !== "watching")
    .sort((a, b) => (b.closed_on ?? "").localeCompare(a.closed_on ?? ""));

  return (
    <>
      <PageHeader
        title="Watch list"
        description="What am I keeping an eye on, and what's due?"
        actions={<NewWatchItemButton />}
      />
      {watching.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Nothing on watch. Add a noise, leak, or wear item you want to keep an
          eye on.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border" aria-label="Watching">
          {watching.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/watch/${w.id}`}
                    className="font-medium hover:underline"
                  >
                    {w.title}
                  </Link>
                  <DueBadge due={w.is_due} overdue={w.is_overdue} />
                  <SeverityBadge severity={w.severity} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {
                    WATCH_SYSTEM_LABELS[
                      w.system as keyof typeof WATCH_SYSTEM_LABELS
                    ]
                  }
                  {" · "}
                  {followupText(w.next_followup_on, w.next_followup_odometer)}
                  {" · "}
                  {w.last_checkin_on
                    ? `Last check-in ${formatDate(w.last_checkin_on)}`
                    : "No check-ins yet"}
                </p>
              </div>
              <div className="flex gap-2">
                <CheckinDialog
                  item={w}
                  today={today}
                  currentOdometer={vehicle.current_odometer}
                  phases={phases}
                  trigger={
                    <Button
                      size="sm"
                      variant={w.is_due ? "default" : "outline"}
                      aria-label={`Check in on ${w.title}`}
                    >
                      Check in
                    </Button>
                  }
                />
                <PromoteDialog
                  item={w}
                  phases={phases}
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Promote ${w.title}`}
                    >
                      Promote
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed-heading" className="mt-8">
          <h2
            id="closed-heading"
            className="text-muted-foreground mb-2 text-sm font-semibold"
          >
            Closed
          </h2>
          <ul className="divide-y rounded-xl border">
            {closed.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"
              >
                <Link
                  href={`/watch/${w.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {w.title}
                </Link>
                <WatchStatusBadge status={w.status} />
                {w.promoted_job_id ? (
                  <Link
                    href={`/jobs/${w.promoted_job_id}`}
                    className="text-xs underline"
                  >
                    Open job
                  </Link>
                ) : (
                  w.closed_on && (
                    <span className="text-muted-foreground text-xs">
                      {formatDate(w.closed_on)}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function followupText(on: string | null, odometer: number | null) {
  if (!on && odometer === null) return "No follow-up set";
  return `Follow up ${[on && formatDate(on), odometer !== null && `at ${formatMiles(odometer)}`].filter(Boolean).join(" or ")}`;
}
