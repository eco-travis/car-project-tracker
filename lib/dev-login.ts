/** Supabase on this machine, or on this machine's private LAN address (`npm run dev:lan`). */
const LOCAL_SUPABASE =
  /^http:\/\/(127\.0\.0\.1|localhost|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;

/**
 * Dev-only auto sign-in (local testing convenience). Every condition must hold:
 * `next dev` (never a production build), DEV_AUTO_LOGIN=1, a password configured,
 * and a Supabase URL on this machine or its private LAN address.
 */
export function devAutoLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTO_LOGIN === "1" &&
    Boolean(process.env.DEV_LOGIN_PASSWORD) &&
    LOCAL_SUPABASE.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  );
}

/** Only same-site paths, so the redirect can't be pointed elsewhere. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
