"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_BAR_COUNT, NAV_ITEMS, isActive } from "./nav-items";

const pinned = NAV_ITEMS.slice(0, BOTTOM_BAR_COUNT);
const overflow = NAV_ITEMS.slice(BOTTOM_BAR_COUNT);

export function BottomNav({ footer }: { footer: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive = overflow.some((item) => isActive(pathname, item.href));

  const tab = "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]";
  return (
    <nav
      aria-label="Main"
      className="bg-background fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {pinned.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  tab,
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              className={cn(
                tab,
                overflowActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              <Ellipsis className="size-5" aria-hidden />
              More
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-3 gap-2 px-4">
                {overflow.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm",
                          active && "bg-accent font-medium",
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4">{footer}</div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
