"use client";

import { useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ToolFormDialog } from "@/components/tools/tool-form-dialog";
import { ToolStatusBadge } from "@/components/tools/tool-status-badge";
import { Button } from "@/components/ui/button";
import { linkTool, unlinkTool } from "@/lib/actions/tools";
import { LinkPicker } from "./link-picker";

type Tool = {
  id: string;
  name: string;
  status: "owned" | "borrowed" | "rented" | "need_to_buy";
};

export function JobToolsPanel({
  jobId,
  tools,
  candidates,
}: {
  jobId: string;
  tools: Tool[];
  candidates: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const toBuy = tools.filter((t) => t.status === "need_to_buy");
  return (
    <div className="flex flex-col gap-4">
      {toBuy.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4" aria-hidden />
          Need to buy: {toBuy.map((t) => t.name).join(", ")}
        </p>
      )}
      {tools.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No tools listed for this job.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Tools needed">
          {tools.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <ToolStatusBadge status={t.status} />
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                aria-label={`Remove ${t.name} from this job`}
                onClick={() =>
                  startTransition(
                    async () =>
                      void (await unlinkTool({ job_id: jobId, tool_id: t.id })),
                  )
                }
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <LinkPicker
            id="link-tool"
            label="Add a tool you have listed"
            placeholder="Choose a tool…"
            options={candidates}
            buttonLabel="Add tool"
            onLink={(toolId) => linkTool({ job_id: jobId, tool_id: toolId })}
          />
        </div>
        <ToolFormDialog
          jobId={jobId}
          trigger={<Button variant="ghost">New tool</Button>}
        />
      </div>
    </div>
  );
}
