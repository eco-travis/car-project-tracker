"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_FILE_TYPES,
  type AttachmentTag,
  type Parent,
} from "@/lib/domain/media";
import { uploadFile } from "@/lib/upload/client";

type Status = {
  name: string;
  state: "uploading" | "done" | "error";
  progress: number | null;
  error?: string;
};

/**
 * File picker + upload queue. On phones the picker offers camera, photo library, and files;
 * we don't force `capture` so the library stays available.
 */
export function UploadButton({
  parent,
  receipt,
  tag,
  label = "Add photos",
  variant = "outline",
  onUploaded,
}: {
  parent: Parent;
  receipt?: boolean;
  tag?: AttachmentTag | null;
  label?: string;
  variant?: "outline" | "default" | "ghost";
  onUploaded?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [queue, setQueue] = useState<Status[]>([]);
  const busy = queue.some((q) => q.state === "uploading");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setQueue(
      list.map((f) => ({ name: f.name, state: "uploading", progress: null })),
    );
    for (const [i, file] of list.entries()) {
      const update = (patch: Partial<Status>) =>
        setQueue((q) => q.map((s, j) => (j === i ? { ...s, ...patch } : s)));
      const result = await uploadFile(file, {
        parent,
        receipt,
        tag,
        onProgress: (progress) => update({ progress }),
      });
      update(
        result.ok
          ? { state: "done", progress: 1 }
          : { state: "error", error: result.error },
      );
    }
    if (input.current) input.current.value = "";
    router.refresh();
    onUploaded?.();
    setQueue((q) => q.filter((s) => s.state === "error"));
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handle(e.target.files)}
        // Opened by the button below; keep it out of the accessibility tree.
        aria-hidden="true"
      />
      <Button
        type="button"
        variant={variant}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden /> {busy ? "Uploading…" : label}
      </Button>
      {queue.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs" aria-live="polite">
          {queue.map((q, i) => (
            <li
              key={`${q.name}-${i}`}
              className={
                q.state === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {q.state === "error"
                ? q.error
                : q.state === "done"
                  ? `${q.name}: uploaded`
                  : `${q.name}: uploading${q.progress !== null && q.progress < 1 ? ` ${Math.round(q.progress * 100)}%` : "…"}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
