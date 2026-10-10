import "server-only";
import { revalidatePath } from "next/cache";

/** Every screen reads the same small dataset, so refresh the whole app after a write. */
export function refreshApp() {
  revalidatePath("/", "layout");
}
