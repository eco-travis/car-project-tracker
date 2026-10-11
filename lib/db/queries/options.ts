import "server-only";
import { createClient } from "@/lib/db/server";

export type Option = { id: string; name: string };
export type LinkOptions = {
  jobs: Option[];
  phases: Option[];
  parts: Option[];
  tools: Option[];
};

/** Records an expense or part can link to, for pickers. */
export async function getLinkOptions(): Promise<LinkOptions> {
  const supabase = await createClient();
  const [jobs, phases, parts, tools] = await Promise.all([
    supabase.from("jobs").select("id, title").order("title"),
    supabase.from("phases").select("id, name").order("sort_order"),
    supabase.from("parts").select("id, name, brand").order("name"),
    supabase.from("tools").select("id, name").order("name"),
  ]);
  for (const r of [jobs, phases, parts, tools]) if (r.error) throw r.error;
  return {
    jobs: jobs.data!.map((j) => ({ id: j.id, name: j.title })),
    phases: phases.data!,
    parts: parts.data!.map((p) => ({
      id: p.id,
      name: p.brand ? `${p.brand} ${p.name}` : p.name,
    })),
    tools: tools.data!,
  };
}
