import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { controlClass } from "@/components/form/field";
import { Gallery } from "@/components/media/gallery";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { getGalleryPage } from "@/lib/db/queries/media";
import { getLinkOptions } from "@/lib/db/queries/options";
import { galleryFiltersSchema } from "@/lib/schemas/gallery";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage({
  searchParams,
}: PageProps<"/gallery">) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;
  const filters = galleryFiltersSchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, first(v)])),
  );
  const [{ items, nextCursor }, links] = await Promise.all([
    getGalleryPage(filters),
    getLinkOptions(),
  ]);
  const active = Boolean(
    filters.phase ||
    filters.job ||
    filters.tag ||
    filters.kind ||
    filters.highlights ||
    filters.docs ||
    filters.order,
  );

  return (
    <>
      <PageHeader title="Gallery" description="How has the build progressed?" />
      <Form
        key={`filters-${JSON.stringify(filters)}`}
        action="/gallery"
        aria-label="Filter gallery"
        className="mb-6 flex flex-wrap items-end gap-2"
      >
        <Select
          name="phase"
          label="Phase"
          value={filters.phase}
          options={links.phases}
        />
        <Select
          name="job"
          label="Job"
          value={filters.job}
          options={links.jobs}
        />
        <Select
          name="tag"
          label="Tag"
          value={filters.tag}
          options={[
            { id: "before", name: "Before" },
            { id: "during", name: "During" },
            { id: "after", name: "After" },
          ]}
        />
        <Select
          name="kind"
          label="Kind"
          value={filters.kind}
          options={[
            { id: "photo", name: "Photos" },
            { id: "clip", name: "Clips" },
            { id: "receipt", name: "Receipts" },
            { id: "document", name: "Documents" },
          ]}
        />
        <Select
          name="order"
          label="Order"
          value={filters.order}
          allLabel="Oldest first"
          options={[{ id: "desc", name: "Newest first" }]}
        />
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="highlights"
            value="1"
            defaultChecked={filters.highlights}
            className="size-4"
          />
          Highlights only
        </label>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="docs"
            value="1"
            defaultChecked={filters.docs}
            className="size-4"
          />
          Include receipts and documents
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {active && (
          <Button variant="ghost" asChild>
            <Link href="/gallery">Clear</Link>
          </Button>
        )}
      </Form>

      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {active
            ? "Nothing matches these filters."
            : "No photos yet. Use Quick add or a job's Add photos."}
        </p>
      ) : (
        <Gallery
          key={`grid-${JSON.stringify(filters)}`}
          initial={items}
          nextCursor={nextCursor}
          filters={filters}
        />
      )}
    </>
  );
}

function Select({
  name,
  label,
  value,
  options,
  allLabel = "All",
}: {
  name: string;
  label: string;
  value?: string;
  options: { id: string; name: string }[];
  allLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`gallery-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={`gallery-${name}`}
        name={name}
        defaultValue={value ?? ""}
        className={cn(controlClass, "h-8 w-40")}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
