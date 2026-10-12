"use client";

/* eslint-disable @next/next/no-img-element -- local blob preview */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Eye, ListChecks, Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WatchItemFormDialog } from "@/components/watch/watch-item-form-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RecentJob } from "@/lib/db/queries/jobs";
import { ACCEPTED_FILE_TYPES } from "@/lib/domain/media";
import { uploadFile } from "@/lib/upload/client";
import { cn } from "@/lib/utils";

const NO_JOB = "vehicle";

/**
 * One button opens: Photo, Watch item, or Task (flows 1, 7, 9).
 * Photo: pick a file, then a job (most recent first, preselected) and an optional note.
 * Save is one tap, or two if you pick another job.
 */
export function QuickAdd({
  jobs,
  variant,
}: {
  jobs: RecentJob[];
  variant: "fab" | "sidebar";
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string>(jobs[0]?.id ?? NO_JOB);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ href: string; label: string } | null>(
    null,
  );
  const [form, setForm] = useState<"watch" | "task" | null>(null);

  function pick() {
    setSaved(null);
    input.current?.click();
  }

  function close() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setNote("");
    setError(null);
    if (input.current) input.current.value = "";
  }

  async function save() {
    if (!file) return;
    setSaving(true);
    setError(null);
    const parent =
      jobId === NO_JOB ? null : ({ kind: "job", id: jobId } as const);
    const result = await uploadFile(file, { parent, caption: note });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    const job = jobs.find((j) => j.id === jobId);
    setSaved(
      job
        ? { href: `/jobs/${job.id}`, label: job.title }
        : { href: "/gallery", label: "the Gallery" },
    );
    close();
    router.refresh();
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="sr-only"
        tabIndex={-1}
        // Opened only by the Quick add button; keep it out of the accessibility tree.
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (preview) URL.revokeObjectURL(preview);
          setPreview(
            f?.type.startsWith("image/") ? URL.createObjectURL(f) : null,
          );
          setFile(f);
          if (f) setJobId(jobs[0]?.id ?? NO_JOB);
        }}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === "fab" ? (
            <Button
              size="icon-lg"
              className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg md:hidden"
              aria-label="Quick add"
            >
              <Plus className="size-6" aria-hidden />
            </Button>
          ) : (
            <Button className="w-full justify-start" aria-label="Quick add">
              <Plus aria-hidden /> Quick add
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={variant === "fab" ? "end" : "start"}
          side={variant === "fab" ? "top" : "bottom"}
          className="w-48"
        >
          <DropdownMenuItem onSelect={pick}>
            <Camera aria-hidden /> Photo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setForm("watch")}>
            <Eye aria-hidden /> Watch item
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setForm("task")}>
            <ListChecks aria-hidden /> Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {form === "watch" && (
        <WatchItemFormDialog
          open
          onOpenChange={(o) => !o && setForm(null)}
          onCreated={(id) =>
            setSaved({ href: `/watch/${id}`, label: "the Watch list" })
          }
        />
      )}
      {form === "task" && (
        <TaskFormDialog
          open
          onOpenChange={(o) => !o && setForm(null)}
          onSaved={() => setSaved({ href: "/tasks", label: "Tasks" })}
        />
      )}
      {saved && (
        <p
          role="status"
          className={cn(
            "text-sm",
            variant === "fab"
              ? "bg-foreground text-background fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 rounded-lg px-3 py-2 shadow md:hidden"
              : "text-muted-foreground mt-2",
          )}
        >
          Saved to{" "}
          <Link
            href={saved.href}
            className="underline"
            onClick={() => setSaved(null)}
          >
            {saved.label}
          </Link>
          .
        </p>
      )}

      <Sheet open={file !== null} onOpenChange={(open) => !open && close()}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <SheetHeader>
            <SheetTitle>Quick add</SheetTitle>
            <SheetDescription>{file?.name}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            {preview && (
              <img
                src={preview}
                alt="Selected photo"
                className="max-h-40 w-auto self-start rounded-lg object-contain"
              />
            )}
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">Job</legend>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {[
                  ...jobs,
                  { id: NO_JOB, title: "No job (vehicle)", phaseName: null },
                ].map((j) => (
                  <label
                    key={j.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      jobId === j.id && "border-foreground bg-accent",
                    )}
                  >
                    <input
                      type="radio"
                      name="quick-add-job"
                      value={j.id}
                      checked={jobId === j.id}
                      onChange={() => setJobId(j.id)}
                      className="size-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{j.title}</span>
                      {j.phaseName && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {j.phaseName}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="quick-add-note" className="text-sm font-medium">
                Note (optional)
              </label>
              <textarea
                id="quick-add-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-lg border bg-transparent px-2.5 py-2 text-base md:text-sm"
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button onClick={save} disabled={saving} size="lg">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
