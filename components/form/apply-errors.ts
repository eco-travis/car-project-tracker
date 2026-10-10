import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/lib/actions/result";

/** Maps a failed action's field errors onto the form; anything else becomes a root error. */
export function applyActionErrors<T extends FieldValues>(
  result: Extract<ActionResult<unknown>, { ok: false }>,
  setError: UseFormSetError<T>,
) {
  const fields = Object.entries(result.fieldErrors ?? {});
  for (const [field, messages] of fields)
    setError(field as Path<T>, { message: messages[0] });
  if (!fields.length) setError("root", { message: result.error });
}
