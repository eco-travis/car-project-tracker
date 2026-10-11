"use client";

import { useState, useTransition } from "react";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadScopedMedia } from "@/lib/actions/attachments";
import type { MediaItem } from "@/lib/db/queries/media";
import type { MediaScope } from "@/lib/schemas/attachment";
import { MediaLightbox } from "./media-lightbox";

/** Flow 11: "View photos" opens the carousel filtered to one record. */
export function ViewPhotosButton({
  scope,
  label = "View photos",
  size = "sm",
}: {
  scope: MediaScope;
  label?: string;
  size?: "sm" | "default";
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await loadScopedMedia(scope);
            if (!result.ok) return setMessage(result.error);
            if (!result.data.length)
              return setMessage("No photos or clips yet.");
            setItems(result.data);
          })
        }
      >
        <Images aria-hidden /> {label}
      </Button>
      {message && (
        <span role="status" className="text-muted-foreground text-xs">
          {message}
        </span>
      )}
      {items && (
        <MediaLightbox items={items} index={0} onClose={() => setItems(null)} />
      )}
    </>
  );
}
