import {
  Car,
  ClipboardList,
  Eye,
  Gauge,
  History,
  Images,
  Lightbulb,
  ListChecks,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Every screen from the spec. The first four are pinned to the phone's bottom bar. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/log", label: "Work Log", icon: History },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/watch", label: "Watch list", icon: Eye },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/parts", label: "Parts", icon: Package },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/inspiration", label: "Inspiration", icon: Lightbulb },
  { href: "/vehicle", label: "Vehicle", icon: Car },
];

export const BOTTOM_BAR_COUNT = 4;

/** Job detail lives under Plan, etc. */
const SECTION_ALIASES: Record<string, string> = { "/jobs": "/plan" };

export function isActive(pathname: string, href: string): boolean {
  const section = "/" + (pathname.split("/")[1] ?? "");
  const resolved = SECTION_ALIASES[section] ?? section;
  return resolved === href;
}
