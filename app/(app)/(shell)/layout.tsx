import { QuickAdd } from "@/components/quick-add/quick-add";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { requireVehicle } from "@/lib/auth";
import { getRecentJobs } from "@/lib/db/queries/jobs";

/** Authenticated shell: sidebar on desktop, bottom nav on phone. Requires a vehicle. */
export default async function ShellLayout({ children }: LayoutProps<"/">) {
  const [vehicle, recentJobs] = await Promise.all([
    requireVehicle(),
    getRecentJobs(),
  ]);
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="bg-foreground text-background sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar
        vehicleName={vehicle.name}
        footer={<SignOutButton />}
        quickAdd={<QuickAdd jobs={recentJobs} variant="sidebar" />}
      />
      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 flex-1 px-4 pt-6 pb-28 outline-none md:px-8 md:pb-8"
      >
        {children}
      </main>
      <div className="md:hidden">
        <QuickAdd jobs={recentJobs} variant="fab" />
      </div>
      <BottomNav footer={<SignOutButton />} />
    </div>
  );
}
