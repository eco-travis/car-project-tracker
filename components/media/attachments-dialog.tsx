"use client";

import { ClientTrigger } from "@/components/client-trigger";
import { useState, useTransition, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { loadAttachments } from "@/lib/actions/attachments";
import type { MediaItem } from "@/lib/db/queries/media";
import type { Parent } from "@/lib/domain/media";
import { AttachmentsPanel } from "./attachments-panel";

/** Attachments for records without their own page (phase, tool, expense). Loads on open. */
export function AttachmentsDialog({
  parent,
  title,
  description,
  receipt,
  uploadLabel,
  trigger,
}: {
  parent: Exclude<Parent, null>;
  title: string;
  description?: string;
  receipt?: boolean;
  uploadLabel?: string;
  trigger: ReactNode;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const load = () =>
    startTransition(async () => {
      const result = await loadAttachments(parent);
      if (result.ok) setItems(result.data);
      else setError(result.error);
    });

  return (
    <Dialog onOpenChange={(open) => (open ? load() : setItems(null))}>
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : items === null ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <AttachmentsPanel
            parent={parent}
            items={items}
            receipt={receipt}
            uploadLabel={uploadLabel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
