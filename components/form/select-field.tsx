import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClass, fieldAria } from "./field";

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  /** Adds a first option with value "" (e.g. "No phase"). */
  emptyLabel?: string;
  error?: string;
  hint?: string;
};

/** Native select: the phone's own picker beats a custom dropdown in the garage. */
export function SelectField({
  label,
  name,
  options,
  emptyLabel,
  error,
  hint,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? name;
  return (
    <Field
      id={selectId}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      <select
        id={selectId}
        name={name}
        className={cn(controlClass, "h-8")}
        {...fieldAria(selectId, error, hint)}
        {...props}
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
