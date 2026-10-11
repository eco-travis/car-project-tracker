"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/lib/db/queries/media";
import type { AttachmentTag, Parent } from "@/lib/domain/media";
import { AttachmentEditDialog } from "./attachment-edit-dialog";
import { MediaTile, tileLabel } from "./media-grid";
import { MediaLightbox, isCarouselItem } from "./media-lightbox";
import { UploadButton } from "./upload-button";

/** Attachments on one record: thumbnails, carousel, edit, upload. */
export function AttachmentsPanel({
  parent,
  items,
  receipt,
  defaultTag,
  uploadLabel,
  emptyText = "No photos or files yet.",
}: {
  parent: Parent;
  items: MediaItem[];
  receipt?: boolean;
  defaultTag?: AttachmentTag;
  uploadLabel?: string;
  emptyText?: string;
}) {
  const carousel = items.filter(isCarouselItem);
  const [open, setOpen] = useState<number | null>(null);

  function openItem(item: MediaItem) {
    const i = carousel.findIndex((c) => c.id === item.id);
    if (i >= 0) setOpen(i);
    else if (item.url) window.open(item.url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <ul
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
          aria-label="Attachments"
        >
          {items.map((item) => (
            <li key={item.id} className="relative">
              <MediaTile item={item} onOpen={() => openItem(item)} />
              <AttachmentEditDialog
                item={item}
                trigger={
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    className="absolute top-1 left-1 opacity-90"
                    aria-label={`Edit ${tileLabel(item)}`}
                  >
                    <Pencil aria-hidden />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <div>
        <UploadButton
          parent={parent}
          receipt={receipt}
          tag={defaultTag}
          label={uploadLabel}
        />
      </div>
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
