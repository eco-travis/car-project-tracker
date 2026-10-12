import type { JobType } from "./types";

export type InspirationLike = {
  title: string;
  source_url: string | null;
  notes: string | null;
  promoted_part_id: string | null;
  promoted_job_id: string | null;
};

/** Free-form tags: trimmed, lowercased, de-duplicated, from a comma-separated string. */
export function normalizeTags(input: string | string[]): string[] {
  const parts = Array.isArray(input) ? input : input.split(",");
  return [
    ...new Set(
      parts
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

/** Every tag in use, alphabetically, for the board's filter. */
export function allTags(items: { tags: string[] }[]): string[] {
  return [...new Set(items.flatMap((i) => i.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function matchesTag(
  item: { tags: string[] },
  tag: string | undefined,
): boolean {
  return !tag || item.tags.includes(tag);
}

/** Rule 19: promote to part creates a Wishlist part from the card. */
export function partFromInspiration(i: InspirationLike) {
  return {
    name: i.title,
    status: "wishlist" as const,
    product_url: i.source_url,
    notes: i.notes,
  };
}

/** Rule 19: promote to job creates a Not started job from the card. */
export function jobFromInspiration(
  i: InspirationLike,
  opts: { phase_id: string | null; type: JobType },
) {
  return {
    title: i.title,
    type: opts.type,
    status: "not_started" as const,
    phase_id: opts.phase_id,
    description: i.notes,
    links: i.source_url ? [i.source_url] : [],
  };
}

/**
 * Rule 19: promoting again is allowed, but overwrites the stored link only after confirmation.
 * Returns the message to confirm, or null when there's nothing to overwrite.
 */
export function overwriteConfirmation(
  i: InspirationLike,
  target: "part" | "job",
): string | null {
  const existing = target === "part" ? i.promoted_part_id : i.promoted_job_id;
  if (!existing) return null;
  return `This card already links to a ${target}. Promoting again creates a new ${target} and links the card to it instead. The existing ${target} stays.`;
}
