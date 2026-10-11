"use client";

import Link from "next/link";
import { PartFormDialog } from "@/components/parts/part-form-dialog";
import { PartStatusBadge } from "@/components/parts/part-status-badge";
import { Button } from "@/components/ui/button";
import { linkPartToJob } from "@/lib/actions/parts";
import type { Option } from "@/lib/db/queries/options";
import type { PartStatus } from "@/lib/domain/types";
import { LinkPicker } from "./link-picker";

type Part = {
  id: string;
  name: string;
  brand: string | null;
  status: PartStatus;
  oem_part_number: string | null;
  aftermarket_part_number: string | null;
};

export function JobPartsPanel({
  jobId,
  parts,
  candidates,
  jobs,
  allParts,
}: {
  jobId: string;
  parts: Part[];
  candidates: Option[];
  jobs: Option[];
  allParts: Option[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {parts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No parts on this job yet.
        </p>
      ) : (
        <ul
          className="divide-y rounded-lg border"
          aria-label="Parts on this job"
        >
          {parts.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <Link href={`/parts/${p.id}`} className="hover:underline">
                  {p.brand ? `${p.brand} ${p.name}` : p.name}
                </Link>
                {(p.oem_part_number || p.aftermarket_part_number) && (
                  <p className="text-muted-foreground font-mono text-xs">
                    {[
                      p.oem_part_number && `OEM ${p.oem_part_number}`,
                      p.aftermarket_part_number,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <PartStatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <LinkPicker
            id="link-part"
            label="Link an existing part"
            placeholder="Choose a part…"
            options={candidates}
            buttonLabel="Link part"
            onLink={(partId) => linkPartToJob(partId, jobId)}
          />
        </div>
        <PartFormDialog
          jobs={jobs}
          parts={allParts}
          defaultJobId={jobId}
          trigger={<Button variant="ghost">New part</Button>}
        />
      </div>
    </div>
  );
}
