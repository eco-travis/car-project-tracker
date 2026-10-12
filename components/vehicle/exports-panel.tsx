import { Download } from "lucide-react";
import { controlClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPORT_TABLES } from "@/lib/domain/exports";
import { cn } from "@/lib/utils";

/**
 * Plan M8: choose options and download. Plain GET forms: the routes answer with a file
 * (Content-Disposition: attachment), so the browser downloads and stays on this page.
 */
export function ExportsPanel({
  phases,
}: {
  phases: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PdfForm
        id="service-history"
        title="Service history (PDF)"
        description="Done maintenance, repair, and diagnosis jobs, newest first, with odometer, parts, and who did the work. For resale or warranty."
        phases={phases}
        receipts
      />
      <PdfForm
        id="build-sheet"
        title="Build sheet (PDF)"
        description="Modifications grouped by phase, with installed parts and one photo per job."
        phases={phases}
      />
      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div>
          <h3 className="font-medium">Full data</h3>
          <p className="text-muted-foreground text-sm">
            Everything, with ids so rows join. The Excel file doubles as your
            backup.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button asChild variant="outline">
            <a href="/api/exports/xlsx" download>
              <Download aria-hidden /> Download Excel (.xlsx)
            </a>
          </Button>
          <form
            action="/api/exports/csv"
            method="get"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="csv-table" className="text-xs">
                One table as CSV
              </Label>
              <select
                id="csv-table"
                name="table"
                className={cn(controlClass, "h-8 w-48")}
                defaultValue="jobs"
              >
                {EXPORT_TABLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              <Download aria-hidden /> Download CSV
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PdfForm({
  id,
  title,
  description,
  phases,
  receipts = false,
}: {
  id: string;
  title: string;
  description: string;
  phases: { id: string; name: string }[];
  receipts?: boolean;
}) {
  return (
    <form
      action={`/api/exports/${id}`}
      method="get"
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-lg border p-3"
    >
      <div>
        <h3 id={`${id}-title`} className="font-medium">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-from`} className="text-xs">
            From
          </Label>
          <Input id={`${id}-from`} name="from" type="date" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-to`} className="text-xs">
            To
          </Label>
          <Input id={`${id}-to`} name="to" type="date" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-phase`} className="text-xs">
            Phase
          </Label>
          <select
            id={`${id}-phase`}
            name="phase"
            className={cn(controlClass, "h-8")}
            defaultValue=""
          >
            <option value="">All phases</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-costs`} className="text-xs">
            Costs
          </Label>
          <select
            id={`${id}-costs`}
            name="costs"
            className={cn(controlClass, "h-8")}
            defaultValue="1"
          >
            <option value="1">Include costs</option>
            <option value="0">Hide all dollar amounts</option>
          </select>
        </div>
        {receipts && (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-receipts`} className="text-xs">
              Receipts
            </Label>
            <select
              id={`${id}-receipts`}
              name="receipts"
              className={cn(controlClass, "h-8")}
              defaultValue="0"
            >
              <option value="0">No thumbnails</option>
              <option value="1">Include receipt thumbnails</option>
            </select>
          </div>
        )}
      </div>
      <Button type="submit" className="self-start">
        <Download aria-hidden /> Download PDF
      </Button>
    </form>
  );
}
