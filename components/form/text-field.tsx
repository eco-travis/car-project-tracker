import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Labeled input with an accessible error message. Spread react-hook-form's register() into it. */
export function TextField({
  label,
  name,
  error,
  hint,
  className,
  id,
  ...inputProps
}: TextFieldProps) {
  const inputId = id ?? name;
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
