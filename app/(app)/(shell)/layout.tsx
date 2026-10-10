import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { requireVehicle } from "@/lib/auth";

/** Authenticated shell: sidebar on desktop, bottom nav on phone. Requires a vehicle. */
export default async function ShellLayout({ children }: LayoutProps<"/">) {
  const vehicle = await requireVehicle();
  return (
    <div className="flex min-h-dvh">
      <Sidebar vehicleName={vehicle.name} footer={<SignOutButton />} />
      <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
        {children}
      </main>
      <BottomNav footer={<SignOutButton />} />
    </div>
  );
}
