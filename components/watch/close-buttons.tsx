"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { closeWatchItem, reopenWatchItem } from "@/lib/actions/watch";
import type { WatchStatus } from "@/lib/domain/watch";

/** Rule 18: resolve or dismiss (check-ins are kept); reopen undoes it. */
export function CloseButtons({
  itemId,
  status,
}: {
  itemId: string;
  status: WatchStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
    });
  return (
    <>
      {status === "watching" ? (
        <>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => closeWatchItem(itemId, "resolved"))}
          >
            Resolve
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => closeWatchItem(itemId, "dismissed"))}
          >
            Dismiss
          </Button>
        </>
      ) : status !== "promoted" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => reopenWatchItem(itemId))}
        >
          Reopen
        </Button>
      ) : null}
      {error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {error}
        </p>
      )}
    </>
  );
}
