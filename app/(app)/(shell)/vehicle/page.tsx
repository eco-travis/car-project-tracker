import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { OdometerForm } from "@/components/vehicle/odometer-form";
import { VehicleForm } from "@/components/vehicle/vehicle-form";
import { requireVehicle } from "@/lib/auth";
import { centsToInput } from "@/lib/format";

export const metadata: Metadata = { title: "Vehicle" };

export default async function VehiclePage() {
  const v = await requireVehicle();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Vehicle"
        description="Vehicle record and reference notes."
      />
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
    </div>
  );
}
