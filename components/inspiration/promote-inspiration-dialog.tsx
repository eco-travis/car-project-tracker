"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ClientTrigger } from "@/components/client-trigger";
import { controlClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { promoteInspiration } from "@/lib/actions/inspiration";
import { JOB_TYPE_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Flow 4 / rule 19: create a Wishlist part or a Not started job (choosing the phase). If the card
 * already links to one, confirm before the link is replaced.
 */
export function PromoteInspirationDialog({
  inspiration,
  target,
  phases,
  trigger,
}: {
  inspiration: { id: string; title: string };
  target: "part" | "job";
  phases: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phaseId, setPhaseId] = useState("");
  const [type, setType] =
    useState<keyof typeof JOB_TYPE_LABELS>("modification");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(overwrite: boolean) {
    setBusy(true);
    setError(null);
    const result = await promoteInspiration(
      inspiration.id,
      target === "part"
        ? { target, overwrite }
        : { target, overwrite, phase_id: phaseId, type },
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.data.status === "confirm")
      return setConfirm(result.data.message);
    router.push(result.data.href);
  }

  const noun = target === "part" ? "part" : "job";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setConfirm(null);
          setError(null);
          setPhaseId("");
          setType("modification");
        }
      }}
    >
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirm ? `Replace the linked ${noun}?` : `Promote to ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {confirm ??
              (target === "part"
                ? `Creates a Wishlist part named “${inspiration.title}”. The card keeps a link to it.`
                : `Creates a Not started job named “${inspiration.title}”. The card keeps a link to it.`)}
          </DialogDescription>
        </DialogHeader>
        {!confirm && target === "job" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="promote-insp-phase"
                className="text-sm font-medium"
              >
                Phase
              </label>
              <select
                id="promote-insp-phase"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className={cn(controlClass, "h-8")}
              >
                <option value="">No phase</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="promote-insp-type"
                className="text-sm font-medium"
              >
                Job type
              </label>
              <select
                id="promote-insp-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as keyof typeof JOB_TYPE_LABELS)
                }
                className={cn(controlClass, "h-8")}
              >
                {options(JOB_TYPE_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          {confirm ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep the current link
              </Button>
              <Button disabled={busy} onClick={() => submit(true)}>
                Create new {noun}
              </Button>
            </>
          ) : (
            <Button disabled={busy} onClick={() => submit(false)}>
              {busy ? "Creating…" : `Create ${noun}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
