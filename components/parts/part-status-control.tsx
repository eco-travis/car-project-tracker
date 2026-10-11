"use client";

import { useState, useTransition } from "react";
import { controlClass } from "@/components/form/field";
import { setPartStatus } from "@/lib/actions/parts";
import type { PartStatus } from "@/lib/domain/types";
import { PART_STATUS_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Rule 8: any status can be set by hand. */
export function PartStatusControl({
  partId,
  status,
}: {
  partId: string;
  status: PartStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="part-status-control" className="text-sm font-medium">
        Status
      </label>
      <select
        id="part-status-control"
        value={status}
        disabled={pending}
        className={cn(controlClass, "h-8 w-48")}
        onChange={(e) => {
          const next = e.target.value as PartStatus;
          setError(null);
          startTransition(async () => {
            const result = await setPartStatus(partId, { status: next });
            if (!result.ok) setError(result.error);
          });
        }}
      >
        {options(PART_STATUS_LABELS).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
