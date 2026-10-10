import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";

/** The signed-in user's id, or a redirect to /login. Verifies the JWT. */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return userId;
});

/** The user's vehicle (MVP has exactly one), or null before onboarding. */
export const getVehicle = cache(async () => {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
});

/** The user's vehicle, or a redirect to onboarding. */
export async function requireVehicle() {
  const vehicle = await getVehicle();
  if (!vehicle) redirect("/onboarding");
  return vehicle;
}
