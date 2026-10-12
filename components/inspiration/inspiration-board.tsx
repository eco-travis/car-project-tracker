"use client";

/* eslint-disable @next/next/no-img-element -- signed Supabase URLs */
import Link from "next/link";
import { ExternalLink, Image as ImageIcon, Pencil } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { AttachmentsDialog } from "@/components/media/attachments-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteInspiration } from "@/lib/actions/inspiration";
import type { InspirationCard } from "@/lib/db/queries/inspiration";
import { InspirationFormDialog } from "./inspiration-form-dialog";
import { PromoteInspirationDialog } from "./promote-inspiration-dialog";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function InspirationBoard({
  cards,
  phases,
}: {
  cards: InspirationCard[];
  phases: { id: string; name: string }[];
}) {
  return (
    <ul
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Ideas"
    >
      {cards.map((c) => (
        <li key={c.id}>
          <article
            aria-labelledby={`insp-${c.id}`}
            className="bg-card flex h-full flex-col overflow-hidden rounded-xl border"
          >
            <div className="bg-muted aspect-[4/3]">
              {c.cover?.thumbUrl ? (
                <img
                  src={c.cover.url ?? c.cover.thumbUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <ImageIcon className="size-8" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <h2 id={`insp-${c.id}`} className="font-semibold">
                {c.title}
              </h2>
              {c.source_url && (
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden />{" "}
                  {host(c.source_url)}
                </a>
              )}
              {c.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1" aria-label="Tags">
                  {c.tags.map((t) => (
                    <li key={t}>
                      <Link href={`/inspiration?tag=${encodeURIComponent(t)}`}>
                        <Badge variant="outline">{t}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {c.notes && (
                <p className="text-muted-foreground line-clamp-3 text-sm">
                  {c.notes}
                </p>
              )}
              {(c.promoted_part || c.promoted_job) && (
                <p className="text-xs">
                  {c.promoted_part && (
                    <>
                      Part:{" "}
                      <Link
                        href={`/parts/${c.promoted_part.id}`}
                        className="underline"
                      >
                        {c.promoted_part.name}
                      </Link>
                    </>
                  )}
                  {c.promoted_part && c.promoted_job && " · "}
                  {c.promoted_job && (
                    <>
                      Job:{" "}
                      <Link
                        href={`/jobs/${c.promoted_job.id}`}
                        className="underline"
                      >
                        {c.promoted_job.title}
                      </Link>
                    </>
                  )}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                <PromoteInspirationDialog
                  inspiration={c}
                  target="part"
                  phases={phases}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Promote ${c.title} to part`}
                    >
                      To part
                    </Button>
                  }
                />
                <PromoteInspirationDialog
                  inspiration={c}
                  target="job"
                  phases={phases}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Promote ${c.title} to job`}
                    >
                      To job
                    </Button>
                  }
                />
                <AttachmentsDialog
                  parent={{ kind: "inspiration", id: c.id }}
                  title={`Images for ${c.title}`}
                  description="Inspiration images stay on this board; they never appear in the Gallery."
                  uploadLabel="Add images"
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Images for ${c.title}`}
                    >
                      <ImageIcon aria-hidden /> {c.imageCount}
                    </Button>
                  }
                />
                <InspirationFormDialog
                  inspiration={c}
                  trigger={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${c.title}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  }
                />
                <ConfirmButton
                  title="Delete idea"
                  description={`Delete "${c.title}" and its images? Parts or jobs created from it stay.`}
                  confirmLabel="Delete idea"
                  onConfirm={() => deleteInspiration(c.id)}
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${c.title}`}
                    >
                      Delete
                    </Button>
                  }
                />
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
