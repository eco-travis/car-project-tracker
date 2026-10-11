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
      <Sidebar
        vehicleName={vehicle.name}
        footer={<SignOutButton />}
        quickAdd={<QuickAdd jobs={recentJobs} variant="sidebar" />}
      />
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-8">
        {children}
      </main>
      <div className="md:hidden">
        <QuickAdd jobs={recentJobs} variant="fab" />
      </div>
      <BottomNav footer={<SignOutButton />} />
    </div>
  );
}
