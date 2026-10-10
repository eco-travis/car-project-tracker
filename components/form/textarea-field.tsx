import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClass, fieldAria } from "./field";

type TextareaFieldProps = ComponentProps<"textarea"> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

export function TextareaField({
  label,
  name,
  error,
  hint,
  className,
  id,
  rows = 3,
  ...props
}: TextareaFieldProps) {
  const textareaId = id ?? name;
  return (
    <Field
      id={textareaId}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      <textarea
        id={textareaId}
        name={name}
        rows={rows}
        className={cn(controlClass, "py-2")}
        {...fieldAria(textareaId, error, hint)}
        {...props}
      />
    </Field>
  );
}
