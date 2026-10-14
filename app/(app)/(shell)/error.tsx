"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Screen-level error state: the shell and navigation stay usable. */
export default function ShellError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 text-center"
    >
      <h1 className="text-lg font-semibold">This screen didn&apos;t load</h1>
      <p className="text-muted-foreground text-sm">
        Something went wrong talking to the database. Your data is safe. Try
        again, or head back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
