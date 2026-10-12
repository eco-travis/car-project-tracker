"use client";

/* eslint-disable @next/next/no-img-element -- signed Supabase URL */
import Link from "next/link";
import { useState } from "react";
import { MediaLightbox } from "@/components/media/media-lightbox";
import type { MediaItem } from "@/lib/db/queries/media";
import { formatDateTime } from "@/lib/format";

export function HighlightPhoto({ item }: { item: MediaItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="overflow-hidden rounded-lg border"
        aria-label={`Open latest highlight, ${formatDateTime(item.takenAt)}`}
      >
        <img
          src={item.url ?? item.thumbUrl ?? ""}
          alt=""
          className="aspect-video w-full object-cover"
        />
      </button>
      <p className="text-muted-foreground text-xs">
        {formatDateTime(item.takenAt)}
        {item.jobTitle && (
          <>
            {" · "}
            <Link href={item.href} className="underline">
              {item.jobTitle}
            </Link>
          </>
        )}
      </p>
      {open && (
        <MediaLightbox
          items={[item]}
          index={0}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
