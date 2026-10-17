"use client";

import { useState, useTransition } from "react";
import { controlClass } from "@/components/form/field";
import { setPartInstalledOn, setPartStatus } from "@/lib/actions/parts";
import type { PartStatus } from "@/lib/domain/types";
import { PART_STATUS_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Rule 8: any status can be set by hand. Installed parts also show their install date here,
 * editable in place (setting Installed dates it today; change it if it went in earlier).
 */
export function PartStatusControl({
  partId,
  status,
  installedOn,
}: {
  partId: string;
  status: PartStatus;
  installedOn: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-4">
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
        </div>
        {(status === "installed" || installedOn) && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="part-installed-on-control"
              className="text-sm font-medium"
            >
              Installed on
            </label>
            <input
              // Re-key when the server value changes (e.g. set to today by the status change).
              key={installedOn ?? "none"}
              id="part-installed-on-control"
              type="date"
              defaultValue={installedOn ?? ""}
              disabled={pending}
              className={cn(controlClass, "h-8 w-44")}
              onChange={(e) => {
                const next = e.target.value;
                if (!next || next === installedOn) return;
                setError(null);
                startTransition(async () => {
                  const result = await setPartInstalledOn(partId, {
                    installed_on: next,
                  });
                  if (!result.ok) setError(result.error);
                });
              }}
            />
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
