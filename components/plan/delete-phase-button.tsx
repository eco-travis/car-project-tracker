"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deletePhase } from "@/lib/actions/phases";
import { phaseDeleteConfirmation } from "@/lib/domain/phases";

export function DeletePhaseButton({
  id,
  name,
  jobCount,
  open,
  onOpenChange,
}: {
  id: string;
  name: string;
  jobCount: number;
  /** Controlled mode (opened from the phase menu): no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange?.(next);
      }}
    >
      {open === undefined && (
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Delete
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete phase</AlertDialogTitle>
          <AlertDialogDescription>
            {phaseDeleteConfirmation(name, jobCount)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await deletePhase(id);
                if (!result.ok) setError(result.error);
              });
            }}
          >
            {pending ? "Deleting…" : "Delete phase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
