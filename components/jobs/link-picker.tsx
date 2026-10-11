"use client";

import { useState, useTransition } from "react";
import { controlClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Pick an existing record and link it" control. */
export function LinkPicker({
  id,
  label,
  placeholder,
  options,
  buttonLabel,
  onLink,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: { id: string; name: string }[];
  buttonLabel: string;
  onLink: (selectedId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!options.length) return null;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected)
          return setError(`${placeholder.replace("…", "")} first.`);
        setError(null);
        startTransition(async () => {
          const result = await onLink(selected);
          if (result.ok) setSelected("");
          else setError(result.error ?? "Something went wrong.");
        });
      }}
    >
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <select
          id={id}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={cn(controlClass, "h-8")}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {buttonLabel}
      </Button>
      {error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
