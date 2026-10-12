"use client";

import Link from "next/link";
import { useTransition } from "react";
import { X } from "lucide-react";
import { LinkPicker } from "@/components/jobs/link-picker";
import { PartStatusBadge } from "@/components/parts/part-status-badge";
import { Button } from "@/components/ui/button";
import { linkSuspectedPart, unlinkSuspectedPart } from "@/lib/actions/watch";
import type { SuspectedPart } from "@/lib/domain/watch";

export function SuspectedParts({
  itemId,
  parts,
  candidates,
}: {
  itemId: string;
  parts: SuspectedPart[];
  candidates: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {parts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No suspected parts.</p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Suspected parts">
          {parts.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Link
                href={`/parts/${p.id}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {p.name}
              </Link>
              <PartStatusBadge status={p.status} />
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                aria-label={`Unlink ${p.name}`}
                onClick={() =>
                  startTransition(
                    async () => void (await unlinkSuspectedPart(itemId, p.id)),
                  )
                }
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <LinkPicker
        id="suspect-part"
        label="Link a suspected part"
        placeholder="Choose a part…"
        options={candidates}
        buttonLabel="Link part"
        onLink={(partId) => linkSuspectedPart(itemId, partId)}
      />
    </div>
  );
}
