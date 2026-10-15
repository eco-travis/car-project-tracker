import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Image as ImageIcon, Pencil, Plus, Receipt } from "lucide-react";
import { z } from "zod";
import { ConfirmButton } from "@/components/confirm-button";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { controlClass } from "@/components/form/field";
import { AttachmentsDialog } from "@/components/media/attachments-dialog";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { ToolFormDialog } from "@/components/tools/tool-form-dialog";
import { ToolStatusBadge } from "@/components/tools/tool-status-badge";
import { Button } from "@/components/ui/button";
import { deleteTool } from "@/lib/actions/tools";
import { getLinkOptions } from "@/lib/db/queries/options";
import { getTools } from "@/lib/db/queries/tools";
import { todayIso } from "@/lib/domain/dates";
import { TOOL_STATUS_LABELS, options } from "@/lib/labels";
import { TOOL_STATUSES } from "@/lib/schemas/tool";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tools" };

const filtersSchema = z.object({
  status: z.enum(TOOL_STATUSES).optional().catch(undefined),
  project: z.literal("1").optional().catch(undefined),
});

export default async function ToolsPage({ searchParams }: PageProps<"/tools">) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;
  const filters = filtersSchema.parse({
    status: first(raw.status),
    project: first(raw.project),
  });
  const [all, links] = await Promise.all([getTools(), getLinkOptions()]);
  const today = todayIso();

  // By status, then name. (Storage location isn't tracked in the UI: Travis's call.)
  const rank = new Map(TOOL_STATUSES.map((s, i) => [s, i]));
  const tools = all
    .filter((t) => !filters.status || t.status === filters.status)
    .filter((t) => !filters.project || t.bought_for_project)
    .sort(
      (a, b) =>
        rank.get(a.status)! - rank.get(b.status)! ||
        a.name.localeCompare(b.name),
    );
  const bought = all.filter((t) => t.bought_for_project);
  const boughtCents = bought.reduce((sum, t) => sum + t.spent_cents, 0);

  return (
    <>
      <PageHeader
        title="Tools"
        description="What do I own and what do I need?"
        actions={
          <ToolFormDialog
            trigger={
              <Button>
                <Plus aria-hidden /> Add tool
              </Button>
            }
          />
        }
      />
      <Form
        key={`${filters.status ?? "all"}-${filters.project ?? ""}`}
        action="/tools"
        aria-label="Filter tools"
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="tools-status" className="text-xs font-medium">
            Status
          </label>
          <select
            id="tools-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={cn(controlClass, "h-8 w-44")}
          >
            <option value="">All</option>
            {options(TOOL_STATUS_LABELS).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="project"
            value="1"
            defaultChecked={filters.project === "1"}
            className="size-4 accent-current"
          />
          Bought for this project
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </Form>
      {bought.length > 0 && (
        <p className="text-muted-foreground mb-4 text-sm">
          Bought for this project: {bought.length}{" "}
          {bought.length === 1 ? "tool" : "tools"}
          {boughtCents !== 0 && (
            <>
              , <Money cents={boughtCents} />
            </>
          )}
        </p>
      )}

      {tools.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {filters.status || filters.project
            ? "No tools match these filters."
            : "No tools yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Tools</caption>
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Tool
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium sm:table-cell"
                >
                  For project
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium md:table-cell"
                >
                  Jobs
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Cost
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tools.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">
                      {t.brand ? `${t.brand} ${t.name}` : t.name}
                    </p>
                    {t.description && (
                      <p className="text-muted-foreground text-xs">
                        {t.description}
                      </p>
                    )}
                    {t.bought_for_project && (
                      <p className="text-muted-foreground text-xs sm:hidden">
                        Bought for this project
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ToolStatusBadge status={t.status} />
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {t.bought_for_project ? "Yes" : ""}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {t.jobs.map((j, i) => (
                      <span key={j.id}>
                        {i > 0 && ", "}
                        <Link
                          href={`/jobs/${j.id}`}
                          className="hover:underline"
                        >
                          {j.title}
                        </Link>
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.spent_cents !== 0 && <Money cents={t.spent_cents} />}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <ExpenseFormDialog
                        options={links}
                        today={today}
                        title={`Add expense for ${t.name}`}
                        preset={{ tool_id: t.id, category: "tool" }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Add expense for ${t.name}`}
                          >
                            <Receipt aria-hidden />
                          </Button>
                        }
                      />
                      <AttachmentsDialog
                        parent={{ kind: "tool", id: t.id }}
                        title={`Photos of ${t.name}`}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Photos of ${t.name}`}
                          >
                            <ImageIcon aria-hidden />
                          </Button>
                        }
                      />
                      <ToolFormDialog
                        tool={t}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Edit ${t.name}`}
                          >
                            <Pencil aria-hidden />
                          </Button>
                        }
                      />
                      <ConfirmButton
                        title="Delete tool"
                        description={`Delete "${t.name}"? It's removed from its jobs; its expenses stay in the ledger, unlinked.`}
                        confirmLabel="Delete tool"
                        onConfirm={deleteTool.bind(null, t.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="xs"
                            aria-label={`Delete ${t.name}`}
                          >
                            Delete
                          </Button>
                        }
                      />
                    </div>
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
