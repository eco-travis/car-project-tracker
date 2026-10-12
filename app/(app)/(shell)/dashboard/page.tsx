import type { Metadata } from "next";
import Link from "next/link";
import { BudgetBarView } from "@/components/dashboard/budget-bar";
import {
  DashboardCard,
  EmptyLine,
} from "@/components/dashboard/dashboard-card";
import { HighlightPhoto } from "@/components/dashboard/highlight-card";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { OdometerForm } from "@/components/vehicle/odometer-form";
import { DueBadge, SeverityBadge } from "@/components/watch/badges";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { requireVehicle } from "@/lib/auth";
import { getDashboard } from "@/lib/db/queries/dashboard";
import { formatDate, formatMiles } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const vehicle = await requireVehicle();
  const d = await getDashboard(vehicle.id);
  const t = d.totals;

  return (
    <>
      <PageHeader title="Dashboard" description="Where does the build stand?" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          title="Money"
          href="/vehicle"
          className="md:col-span-2 xl:col-span-1"
        >
          <dl className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <dt className="text-muted-foreground text-xs">Total invested</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                <Money cents={t.totalInvested} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Build cost</dt>
              <dd className="font-semibold tabular-nums">
                <Money cents={t.build} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Ownership cost</dt>
              <dd className="font-semibold tabular-nums">
                <Money cents={t.ownership} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Tools</dt>
              <dd className="tabular-nums">
                <Money cents={t.tools} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Recovered</dt>
              <dd className="tabular-nums">
                <Money cents={-t.recovered} />
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground text-xs">
                Committed, not yet paid
              </dt>
              <dd className="tabular-nums">
                <Money cents={t.committed} />
              </dd>
            </div>
          </dl>
        </DashboardCard>

        <DashboardCard title="Active phase" href="/plan">
          {d.activePhase ? (
            <>
              <p className="font-medium">{d.activePhase.name}</p>
              <BudgetBarView
                costs={d.activePhase.costs}
                label={`${d.activePhase.name} budget`}
              />
            </>
          ) : (
            <EmptyLine>
              No phase is marked Active. Set one on the Plan.
            </EmptyLine>
          )}
        </DashboardCard>

        <DashboardCard
          title="Jobs ready or waiting"
          href="/plan"
          count={d.ready.length + d.waiting.length}
        >
          {d.ready.length + d.waiting.length === 0 ? (
            <EmptyLine>Nothing ready or waiting on parts.</EmptyLine>
          ) : (
            <ul
              className="flex flex-col gap-2 text-sm"
              aria-label="Jobs ready or waiting on parts"
            >
              {[...d.ready, ...d.waiting].map((j) => (
                <li key={j.id} className="flex items-center gap-2">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {j.title}
                    {j.phase && (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        · {j.phase.name}
                      </span>
                    )}
                  </Link>
                  <JobStatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Parts arriving"
          href="/parts?status=ordered"
          count={d.arriving.length}
        >
          {d.arriving.length === 0 ? (
            <EmptyLine>No parts on order.</EmptyLine>
          ) : (
            <ul
              className="flex flex-col gap-2 text-sm"
              aria-label="Parts on order"
            >
              {d.arriving.map((p) => (
                <li key={p.id}>
                  <Link href={`/parts/${p.id}`} className="hover:underline">
                    {p.brand ? `${p.brand} ${p.name}` : p.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {[
                      p.vendor,
                      p.job?.title,
                      p.return_by && `return by ${formatDate(p.return_by)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Watch items due"
          href="/watch"
          count={d.watchDue.length}
        >
          {d.watchDue.length === 0 ? (
            <EmptyLine>Nothing due for a check-in.</EmptyLine>
          ) : (
            <ul
              className="flex flex-col gap-2 text-sm"
              aria-label="Watch items due or overdue"
            >
              {d.watchDue.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/watch/${w.id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {w.title}
                  </Link>
                  <DueBadge due={w.is_due} overdue={w.is_overdue} />
                  <SeverityBadge severity={w.severity} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Tasks due this week"
          href="/tasks"
          count={d.tasksDueSoon.length}
        >
          {d.tasksDueSoon.length === 0 ? (
            <EmptyLine>No tasks due in the next 7 days.</EmptyLine>
          ) : (
            <ul
              className="flex flex-col gap-2 text-sm"
              aria-label="Tasks due within 7 days"
            >
              {d.tasksDueSoon.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 truncate">{task.title}</span>
                  <span
                    className={
                      task.due_on! < d.today
                        ? "text-destructive text-xs font-medium"
                        : "text-muted-foreground text-xs"
                    }
                  >
                    {formatDate(task.due_on)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Odometer" href="/vehicle">
          <p className="text-2xl font-semibold tabular-nums">
            {formatMiles(vehicle.current_odometer)}
          </p>
          <OdometerForm current={vehicle.current_odometer} />
        </DashboardCard>

        <DashboardCard
          title="Latest highlight"
          href="/gallery?highlights=1"
          className="md:col-span-2 xl:col-span-2"
        >
          {d.highlight ? (
            <HighlightPhoto item={d.highlight} />
          ) : (
            <EmptyLine>
              No highlights yet. Star a photo in the Gallery.
            </EmptyLine>
          )}
        </DashboardCard>
      </div>
    </>
  );
}
