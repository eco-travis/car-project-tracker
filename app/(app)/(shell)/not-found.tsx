import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Unknown job, part, or watch item ids (pages call notFound()). */
export default function ShellNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-muted-foreground text-sm">
        That record doesn&apos;t exist anymore, or the link is wrong.
      </p>
      <Button variant="outline" asChild>
        <Link href="/dashboard">Back to the dashboard</Link>
      </Button>
    </div>
  );
}
