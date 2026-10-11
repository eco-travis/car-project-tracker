import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/db/server";
import { devAutoLoginEnabled, safeNextPath } from "@/lib/dev-login";

/** Signs in as ALLOWED_EMAIL with the local dev password. 404 unless devAutoLoginEnabled(). */
export async function GET(request: NextRequest) {
  if (!devAutoLoginEnabled())
    return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.ALLOWED_EMAIL!,
    password: process.env.DEV_LOGIN_PASSWORD!,
  });
  if (error) {
    console.error(
      "Dev auto sign-in failed. Run `npm run db:dev-password`.",
      error.message,
    );
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.redirect(
    new URL(
      safeNextPath(request.nextUrl.searchParams.get("next")),
      request.url,
    ),
  );
}
