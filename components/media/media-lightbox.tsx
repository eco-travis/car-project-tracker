"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { setHighlight } from "@/lib/actions/attachments";
import type { MediaItem } from "@/lib/db/queries/media";
import { formatDateTime, formatMiles } from "@/lib/format";

/** Only photos and clips go in the carousel; receipts and documents open on their own. */
export function isCarouselItem(item: MediaItem): boolean {
  return (
    (item.kind === "photo" ||
      item.kind === "clip" ||
      (item.kind === "receipt" && item.mime.startsWith("image/"))) &&
    !!item.url
  );
}

function toSlide(item: MediaItem): Slide {
  const caption = {
    title: [
      formatDateTime(item.takenAt),
      item.odometer !== null ? formatMiles(item.odometer) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    description: (
      <span>
        {[item.phaseName, item.jobTitle].filter(Boolean).join(" · ")}
        {item.caption && <span className="block">{item.caption}</span>}
        <Link href={item.href} className="mt-1 inline-block underline">
          Open {item.parentTitle ?? "record"}
        </Link>
      </span>
    ),
  };
  if (item.mime.startsWith("video/")) {
    return {
      type: "video",
      sources: [{ src: item.url!, type: item.mime }],
      ...caption,
    } as Slide;
  }
  if (item.mime.startsWith("audio/")) {
    // Rendered by render.slide below.
    return {
      type: "audio" as never,
      src: item.url!,
      ...caption,
    } as unknown as Slide;
  }
  return { src: item.url!, ...caption };
}

/**
 * Full-screen carousel: swipe, pinch zoom, video and audio playback, a caption with date,
 * odometer, phase, job and a link to the record (flow 10), and a highlight star.
 */
export function MediaLightbox({
  items,
  index,
  onClose,
}: {
  items: MediaItem[];
  index: number | null;
  onClose: () => void;
}) {
  // Stable slides: the lightbox jumps back to `index` whenever `slides` changes identity.
  const slides = useMemo(() => items.map(toSlide), [items]);
  const [current, setCurrent] = useState(index ?? 0);
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const item = items[current];
  const starred = item ? (highlights[item.id] ?? item.highlight) : false;

  async function toggleStar() {
    if (!item) return;
    const next = !starred;
    setHighlights((h) => ({ ...h, [item.id]: next }));
    setError(null);
    const result = await setHighlight(item.id, next);
    if (!result.ok) {
      setHighlights((h) => ({ ...h, [item.id]: !next }));
      setError(result.error);
    }
  }

  return (
    <Lightbox
      open={index !== null}
      index={index ?? 0}
      close={onClose}
      slides={slides}
      plugins={[Captions, Video, Zoom]}
      captions={{ descriptionMaxLines: 6, descriptionTextAlign: "start" }}
      on={{ view: ({ index: i }) => setCurrent(i) }}
      carousel={{ finite: true }}
      toolbar={{
        buttons: [
          <button
            key="star"
            type="button"
            className="yarl__button"
            aria-pressed={starred}
            aria-label={starred ? "Remove highlight" : "Highlight"}
            title={error ?? (starred ? "Remove highlight" : "Highlight")}
            onClick={toggleStar}
          >
            <Star
              className="size-6"
              fill={starred ? "currentColor" : "none"}
              aria-hidden
            />
          </button>,
          "close",
        ],
      }}
      render={{
        // Nothing to navigate to with a single slide.
        buttonPrev: slides.length <= 1 ? () => null : undefined,
        buttonNext: slides.length <= 1 ? () => null : undefined,
        slide: ({ slide }) =>
          (slide as { type?: string }).type === "audio" ? (
            <div className="flex h-full w-full items-center justify-center">
              <audio
                controls
                src={(slide as unknown as { src: string }).src}
                className="w-80 max-w-full"
              />
            </div>
          ) : undefined,
      }}
    />
  );
}
