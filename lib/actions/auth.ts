"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { isAllowedEmail } from "@/lib/domain/auth";
import { serverEnv } from "@/lib/env";
import { loginSchema } from "@/lib/schemas/auth";
import { fail, invalid, ok, type ActionResult } from "./result";

const NOT_ALLOWED = "That email can't sign in to this tracker.";

export async function requestMagicLink(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Reject before calling Supabase so no email is sent to anyone else.
  if (!isAllowedEmail(parsed.data.email, serverEnv().ALLOWED_EMAIL))
    return fail(NOT_ALLOWED);

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    console.error("signInWithOtp failed", error);
    return fail("Couldn't send the sign-in link. Try again in a minute.");
  }
  return ok();
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
