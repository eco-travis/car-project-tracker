import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AttachmentsPanel } from "@/components/media/attachments-panel";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { VehicleTotals } from "@/components/vehicle-totals";
import { OdometerForm } from "@/components/vehicle/odometer-form";
import { VehicleForm } from "@/components/vehicle/vehicle-form";
import { requireVehicle } from "@/lib/auth";
import { getVehicleTotals } from "@/lib/db/queries/costs";
import { getExpenses } from "@/lib/db/queries/expenses";
import { getAttachmentsFor } from "@/lib/db/queries/media";
import { getLinkOptions } from "@/lib/db/queries/options";
import { todayIso } from "@/lib/domain/dates";
import { centsToInput } from "@/lib/format";

export const metadata: Metadata = { title: "Vehicle" };

export default async function VehiclePage() {
  const v = await requireVehicle();
  const [totals, expenses, links, media] = await Promise.all([
    getVehicleTotals(v.id),
    getExpenses(),
    getLinkOptions(),
    getAttachmentsFor(null),
  ]);
  const today = todayIso();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Vehicle"
        description="Vehicle record and reference notes."
      />
      <section
        aria-labelledby="money-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="money-heading" className="mb-3 font-semibold">
          Money
        </h2>
        <VehicleTotals totals={totals} purchasePrice={v.purchase_price_cents} />
      </section>
      <section
        aria-labelledby="odometer-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="odometer-heading" className="mb-3 font-semibold">
          Odometer
        </h2>
        <OdometerForm current={v.current_odometer} />
      </section>
      <section
        aria-labelledby="record-heading"
        className="rounded-xl border p-4"
      >
        <h2 id="record-heading" className="mb-3 font-semibold">
          Record and notes
        </h2>
        <VehicleForm
          defaults={{
            name: v.name,
            year: v.year === null ? "" : String(v.year),
            model: v.model ?? "",
            generation: v.generation ?? "",
            vin: v.vin ?? "",
            purchase_date: v.purchase_date ?? "",
            purchase_price_cents: centsToInput(v.purchase_price_cents),
            notes: v.notes ?? "",
          }}
        />
      </section>
      <section
        aria-labelledby="vehicle-photos-heading"
        className="rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="vehicle-photos-heading" className="font-semibold">
            Photos and files
          </h2>
        </div>
        <AttachmentsPanel
          parent={null}
          items={media}
          emptyText="No vehicle-level photos or documents yet (title, registration, purchase photos)."
        />
      </section>
      <section
        aria-labelledby="ledger-heading"
        className="rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="ledger-heading" className="font-semibold">
            Expense ledger
          </h2>
          <ExpenseFormDialog
            options={links}
            today={today}
            trigger={
              <Button variant="outline" size="sm">
                <Plus aria-hidden /> Add expense
              </Button>
            }
          />
        </div>
        <ExpenseList expenses={expenses} options={links} today={today} />
      </section>
    </div>
  );
}
