import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A dashboard card whose heading links to its screen. */
export function DashboardCard({
  title,
  href,
  count,
  className,
  children,
}: {
  title: string;
  href: string;
  count?: number;
  className?: string;
  children: ReactNode;
}) {
  const id = `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4",
        className,
      )}
    >
      <h2 id={id} className="font-semibold">
        <Link
          href={href}
          className="group inline-flex items-center gap-1 hover:underline"
        >
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground text-sm font-normal">
              ({count})
            </span>
          )}
          <ChevronRight
            className="text-muted-foreground size-4 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </h2>
      {children}
    </section>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
