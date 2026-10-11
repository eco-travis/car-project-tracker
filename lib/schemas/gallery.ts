import { z } from "zod";

const flag = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "on" || v === "true");

/** Gallery filters from the URL. Bad values are dropped, not errors. */
export const galleryFiltersSchema = z.object({
  phase: z.uuid().optional().catch(undefined),
  job: z.uuid().optional().catch(undefined),
  tag: z.enum(["before", "during", "after"]).optional().catch(undefined),
  kind: z
    .enum(["photo", "clip", "receipt", "document"])
    .optional()
    .catch(undefined),
  highlights: flag.catch(false),
  docs: flag.catch(false),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export type GalleryFilterInput = z.output<typeof galleryFiltersSchema>;
