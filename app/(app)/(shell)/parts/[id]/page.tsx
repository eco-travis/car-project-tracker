import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ConfirmButton } from "@/components/confirm-button";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Money } from "@/components/money";
import { PartFormDialog } from "@/components/parts/part-form-dialog";
import { PartStatusControl } from "@/components/parts/part-status-control";
import { RecordSaleDialog } from "@/components/parts/record-sale-dialog";
import { Button } from "@/components/ui/button";
import { deletePart } from "@/lib/actions/parts";
import { getLinkOptions } from "@/lib/db/queries/options";
import { getPart } from "@/lib/db/queries/parts";
import { todayIso } from "@/lib/domain/dates";
import { formatDate } from "@/lib/format";
import { PART_CATEGORY_LABELS } from "@/lib/labels";

export async function generateMetadata({
  params,
}: PageProps<"/parts/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Part" };
  return { title: (await getPart(id))?.part.name ?? "Part" };
}

export default async function PartPage({ params }: PageProps<"/parts/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, links] = await Promise.all([getPart(id), getLinkOptions()]);
  if (!data) notFound();
  const { part } = data;
  const today = todayIso();
  const title = part.brand ? `${part.brand} ${part.name}` : part.name;

  async function remove() {
    "use server";
    const result = await deletePart(id);
    if (result.ok) redirect("/parts");
    return result;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            <Link href="/parts" className="hover:underline">
              Parts
            </Link>{" "}
            / {PART_CATEGORY_LABELS[part.category]}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {part.quantity > 1 && (
            <p className="text-muted-foreground text-sm">
              Quantity {part.quantity}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <PartFormDialog
            part={part}
            jobs={links.jobs}
            parts={links.parts}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <ConfirmButton
            title="Delete part"
            description={`Delete "${title}"? Its expenses stay in the ledger, unlinked.`}
            confirmLabel="Delete part"
            onConfirm={remove}
            trigger={<Button variant="ghost">Delete</Button>}
          />
        </div>
      </header>

      <section
        aria-label="Status and actions"
        className="flex flex-wrap items-end justify-between gap-4 rounded-xl border p-4"
      >
        <PartStatusControl partId={part.id} status={part.status} />
        <div className="flex flex-wrap gap-2">
          <ExpenseFormDialog
            options={links}
            today={today}
            preset={{
              part_id: part.id,
              category: "part",
              state: "committed",
              vendor: part.vendor ?? "",
              // Spec decision: a part-only expense counts toward the part's job anyway.
            }}
            trigger={<Button variant="outline">Add expense</Button>}
          />
          <RecordSaleDialog
            available={part.status === "removed"}
            partId={part.id}
            partName={title}
            today={today}
            trigger={<Button>Record sale</Button>}
          />
        </div>
      </section>

      <section aria-labelledby="part-details" className="rounded-xl border p-4">
        <h2 id="part-details" className="mb-3 font-semibold">
          Details
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Detail label="Job">
            {part.job ? (
              <Link href={`/jobs/${part.job.id}`} className="underline">
                {part.job.title}
              </Link>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Replaces">
            {part.replaces ? (
              <Link href={`/parts/${part.replaces.id}`} className="underline">
                {part.replaces.name}
              </Link>
            ) : (
              "—"
            )}
          </Detail>
          {data.replacedBy.length > 0 && (
            <Detail label="Replaced by">
              {data.replacedBy.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <Link href={`/parts/${r.id}`} className="underline">
                    {r.name}
                  </Link>
                </span>
              ))}
            </Detail>
          )}
          <Detail label="OEM part number" mono>
            {part.oem_part_number ?? "—"}
          </Detail>
          <Detail label="Superseded numbers" mono>
            {part.superseded_numbers.join(", ") || "—"}
          </Detail>
          <Detail label="Aftermarket part number" mono>
            {part.aftermarket_part_number ?? "—"}
          </Detail>
          <Detail label="Fitment notes">{part.fitment_notes ?? "—"}</Detail>
          <Detail label="Vendor">{part.vendor ?? "—"}</Detail>
          <Detail label="Order number" mono>
            {part.order_number ?? "—"}
          </Detail>
          <Detail label="Product link">
            {part.product_url ? (
              <a
                href={part.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline"
              >
                {part.product_url}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Return by">
            {part.return_by ? formatDate(part.return_by) : "—"}
          </Detail>
          <Detail label="Warranty notes">{part.warranty_notes ?? "—"}</Detail>
          <Detail label="Notes">
            <span className="whitespace-pre-wrap">{part.notes ?? "—"}</span>
          </Detail>
        </dl>
      </section>

      <section aria-labelledby="part-money" className="rounded-xl border p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="part-money" className="font-semibold">
            Expenses
          </h2>
          <p className="text-muted-foreground text-sm">
            Spent <Money cents={data.spent} />
            {data.sold > 0 && (
              <>
                {" "}
                · Sold for <Money cents={data.sold} />
              </>
            )}
          </p>
        </div>
        <ExpenseList
          expenses={data.expenses}
          options={links}
          today={today}
          hide={["part"]}
        />
      </section>
    </div>
  );
}

function Detail({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{children}</dd>
    </div>
  );
}
