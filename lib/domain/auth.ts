/** True when `email` matches the single allowed address (case- and whitespace-insensitive). */
export function isAllowedEmail(email: string, allowedEmail: string): boolean {
  const normalize = (s: string) => s.trim().toLowerCase();
  return (
    normalize(email) !== "" && normalize(email) === normalize(allowedEmail)
  );
}
