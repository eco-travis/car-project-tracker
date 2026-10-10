/** Content-Security-Policy for a page response. Scripts need the per-request nonce. */
export function buildCsp(
  nonce: string,
  supabaseUrl: string,
  isDev: boolean,
): string {
  const supabase = new URL(supabaseUrl).origin;
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Radix and Next set inline style attributes; styles can't execute code.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${supabase}`,
    `media-src 'self' blob: ${supabase}`,
    `connect-src 'self' ${supabase}`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  return directives.join("; ");
}
