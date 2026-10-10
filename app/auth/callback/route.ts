import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/db/server";

/**
 * Magic-link landing. Our email template sends `token_hash` + `type` (works in any browser);
 * a PKCE `code` is also accepted for Supabase's default template.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  let error: unknown = new Error("Missing token");
  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }

  const target = error ? "/login?error=link" : "/";
  return NextResponse.redirect(new URL(target, request.url));
}
