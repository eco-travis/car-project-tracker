import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Field, fieldAria } from "./field";

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
  return (
    <Field
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      <Input
        id={inputId}
        name={name}
        {...fieldAria(inputId, error, hint)}
        {...inputProps}
      />
    </Field>
  );
}
