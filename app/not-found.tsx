import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        There&apos;s nothing at this address.
      </p>
      <Link href="/" className="text-sm underline">
        Go to the dashboard
      </Link>
    </main>
  );
}
