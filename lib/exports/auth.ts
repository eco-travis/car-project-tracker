import "server-only";
import { createClient } from "@/lib/db/server";

/** Route handlers answer 401 (not a redirect) without a session. proxy.ts also enforces this. */
export async function routeSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .maybeSingle();
  return vehicle ? { supabase, userId, vehicle } : null;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function fileResponse(
  body: Uint8Array | ArrayBuffer,
  filename: string,
  contentType: string,
) {
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
