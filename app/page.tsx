import { redirect } from "next/navigation";
import { getVehicle } from "@/lib/auth";

export default async function Home() {
  const vehicle = await getVehicle();
  redirect(vehicle ? "/dashboard" : "/onboarding");
}
