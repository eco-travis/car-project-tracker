import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Plus } from "lucide-react";
import { z } from "zod";
import { controlClass } from "@/components/form/field";
import { Money } from "@/components/money";
import { PartFormDialog } from "@/components/parts/part-form-dialog";
import { PartStatusBadge } from "@/components/parts/part-status-badge";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLinkOptions } from "@/lib/db/queries/options";
import { getParts, matchesPartSearch } from "@/lib/db/queries/parts";
import {
  PART_CATEGORY_LABELS,
  PART_STATUS_LABELS,
  options,
} from "@/lib/labels";
import { PART_STATUSES } from "@/lib/schemas/part";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Parts" };

const filtersSchema = z.object({
  status: z.enum(PART_STATUSES).optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
});

export default async function PartsPage({ searchParams }: PageProps<"/parts">) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;
  const filters = filtersSchema.parse({
    status: first(raw.status),
    q: first(raw.q),
  });
  const [all, links] = await Promise.all([getParts(), getLinkOptions()]);

  // Grouped by status in lifecycle order, then by name.
  const rank = new Map(PART_STATUSES.map((s, i) => [s, i]));
  const parts = all
    .filter(
      (p) =>
        (!filters.status || p.status === filters.status) &&
        matchesPartSearch(p, filters.q ?? ""),
    )
    .sort(
      (a, b) =>
        rank.get(a.status)! - rank.get(b.status)! ||
        a.name.localeCompare(b.name),
    );
  const filtered = Boolean(filters.status || filters.q);

  return (
    <>
      <PageHeader
        title="Parts"
        description="What's on order, installed, or still an idea?"
        actions={
          <PartFormDialog
            jobs={links.jobs}
            parts={links.parts}
            openAfterCreate
            trigger={
              <Button>
                <Plus aria-hidden /> Add part
              </Button>
            }
          />
        }
      />
      <Form
        key={JSON.stringify(filters)}
        action="/parts"
        role="search"
        aria-label="Filter parts"
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="parts-q" className="text-xs font-medium">
            Search
          </label>
          <Input
            id="parts-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, brand, vendor, any part number"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="parts-status" className="text-xs font-medium">
            Status
          </label>
          <select
            id="parts-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={cn(controlClass, "h-8 w-44")}
          >
            <option value="">All</option>
            {options(PART_STATUS_LABELS).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/parts">Clear</Link>
          </Button>
        )}
      </Form>

      {parts.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {filtered
            ? "No parts match these filters."
            : "No parts yet. Add one, or promote an idea from Inspiration later."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Parts</caption>
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Part
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium md:table-cell"
                >
                  Part numbers
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium lg:table-cell"
                >
                  Vendor
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Cost
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium md:table-cell"
                >
                  Job
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <Link
                      href={`/parts/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.brand ? `${p.brand} ${p.name}` : p.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {PART_CATEGORY_LABELS[p.category]}
                      {p.quantity > 1 && ` · ×${p.quantity}`}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <PartStatusBadge status={p.status} />
                  </td>
                  <td className="hidden px-3 py-2 font-mono text-xs md:table-cell">
                    {[
                      p.oem_part_number && `OEM ${p.oem_part_number}`,
                      p.aftermarket_part_number,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                  <td className="hidden px-3 py-2 lg:table-cell">{p.vendor}</td>
                  <td className="px-3 py-2 text-right">
                    {p.spent_cents > 0 && <Money cents={p.spent_cents} />}
                    {p.sold_cents > 0 && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        sold <Money cents={p.sold_cents} />
                      </p>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {p.job && (
                      <Link
                        href={`/jobs/${p.job.id}`}
                        className="hover:underline"
                      >
                        {p.job.title}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
