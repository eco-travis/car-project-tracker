import { requireUserId } from "@/lib/auth";

/** Everything under (app) requires a session. proxy.ts redirects first; this is the backstop. */
export default async function AuthenticatedLayout({
  children,
}: LayoutProps<"/">) {
  await requireUserId();
  return children;
}
