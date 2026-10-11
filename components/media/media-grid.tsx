"use client";

/* eslint-disable @next/next/no-img-element -- signed Supabase URLs; next/image would proxy and re-sign them */
import { FileText, Image as ImageIcon, Music, Play, Star } from "lucide-react";
import type { MediaItem } from "@/lib/db/queries/media";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TAG_LABEL = {
  before: "Before",
  during: "During",
  after: "After",
} as const;

export function tileLabel(item: MediaItem): string {
  const what =
    item.kind === "clip"
      ? item.mime.startsWith("audio/")
        ? "Audio clip"
        : "Video clip"
      : item.kind === "photo"
        ? "Photo"
        : item.kind === "receipt"
          ? "Receipt"
          : "Document";
  return `${what}, ${formatDateTime(item.takenAt)}${item.tag ? `, ${TAG_LABEL[item.tag].toLowerCase()}` : ""}${item.highlight ? ", highlighted" : ""}`;
}

/** Thumbnail tile: image thumb, or an icon for clips, PDFs, and HEIC (no browser thumbnail). */
export function MediaTile({
  item,
  onOpen,
  className,
}: {
  item: MediaItem;
  onOpen: () => void;
  className?: string;
}) {
  const Icon =
    item.kind === "clip"
      ? item.mime.startsWith("audio/")
        ? Music
        : Play
      : item.mime === "application/pdf"
        ? FileText
        : ImageIcon;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tileLabel(item)}
      className={cn(
        "group bg-muted focus-visible:ring-ring/50 relative aspect-square overflow-hidden rounded-lg border focus-visible:ring-3 focus-visible:outline-none",
        className,
      )}
    >
      {item.thumbUrl ? (
        <img
          src={item.thumbUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      ) : (
        <span className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
          <Icon className="size-8" aria-hidden />
          <span className="text-[10px] uppercase">
            {item.mime.split("/")[1]?.slice(0, 10)}
          </span>
        </span>
      )}
      {item.tag && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {TAG_LABEL[item.tag]}
        </span>
      )}
      {item.highlight && (
        <Star
          className="absolute top-1 right-1 size-4 fill-amber-400 text-amber-400 drop-shadow"
          aria-hidden
        />
      )}
    </button>
  );
}
