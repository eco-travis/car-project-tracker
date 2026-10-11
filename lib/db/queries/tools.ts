import "server-only";
import { createClient } from "@/lib/db/server";

export async function getTools() {
  const supabase = await createClient();
  const [tools, costs, links] = await Promise.all([
    supabase.from("tools").select("*").order("name"),
    supabase.from("v_tool_costs").select("tool_id, spent_cents"),
    supabase.from("job_tools").select("tool_id, job:jobs(id, title, status)"),
  ]);
  for (const r of [tools, costs, links]) if (r.error) throw r.error;
  const spent = new Map(
    costs.data!.map((c) => [c.tool_id, c.spent_cents ?? 0]),
  );
  return tools.data!.map((t) => ({
    ...t,
    spent_cents: spent.get(t.id) ?? 0,
    jobs: links
      .data!.filter((l) => l.tool_id === t.id && l.job)
      .map((l) => l.job!),
  }));
}

export type ToolRow = Awaited<ReturnType<typeof getTools>>[number];
