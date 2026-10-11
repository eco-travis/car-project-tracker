/**
 * Dev-only auto sign-in (local testing convenience). Every condition must hold:
 * `next dev` (never a production build), DEV_AUTO_LOGIN=1, a password configured,
 * and a Supabase URL on this machine.
 */
export function devAutoLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTO_LOGIN === "1" &&
    Boolean(process.env.DEV_LOGIN_PASSWORD) &&
    /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    )
  );
}

/** Only same-site paths, so the redirect can't be pointed elsewhere. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
