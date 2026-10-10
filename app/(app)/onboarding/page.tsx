import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVehicle } from "@/lib/auth";
import { SEED_PHASE_NAMES } from "@/lib/domain/phases";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your vehicle" };

export default async function OnboardingPage() {
  if (await getVehicle()) redirect("/dashboard");
  return (
    <main className="flex flex-1 justify-center p-4 sm:items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Set up your vehicle</CardTitle>
          <CardDescription>
            You can change any of this later. We&apos;ll start your plan with
            these phases: {SEED_PHASE_NAMES.join(", ")}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
