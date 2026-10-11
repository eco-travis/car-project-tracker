"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadGalleryPage } from "@/lib/actions/attachments";
import type { GalleryFilters, MediaItem } from "@/lib/db/queries/media";
import { monthKey, monthLabel } from "@/lib/domain/dates";
import { MediaTile } from "./media-grid";
import { MediaLightbox, isCarouselItem } from "./media-lightbox";

/** Gallery grid grouped by taken month (Pacific), with Load more and the carousel. */
export function Gallery({
  initial,
  nextCursor,
  filters,
}: {
  initial: MediaItem[];
  nextCursor: string | null;
  filters: GalleryFilters;
}) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(nextCursor);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const carousel = items.filter(isCarouselItem);

  const groups: { key: string; items: MediaItem[] }[] = [];
  for (const item of items) {
    const key = monthKey(item.takenAt);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1)!.items.push(item);
  }

  function openItem(item: MediaItem) {
    const i = carousel.findIndex((c) => c.id === item.id);
    if (i >= 0) setOpen(i);
    else if (item.url) window.open(item.url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`month-${g.key}`}>
          <h2
            id={`month-${g.key}`}
            className="text-muted-foreground mb-2 text-sm font-semibold"
          >
            {monthLabel(g.key)}
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {g.items.map((item) => (
              <li key={item.id}>
                <MediaTile item={item} onOpen={() => openItem(item)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {cursor && (
        <Button
          variant="outline"
          className="self-center"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const page = await loadGalleryPage(filters, cursor);
                setItems((xs) => [...xs, ...page.items]);
                setCursor(page.nextCursor);
              } catch {
                setError("Couldn't load more. Try again.");
              }
            })
          }
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {open !== null && (
        <MediaLightbox
          items={carousel}
          index={open}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
