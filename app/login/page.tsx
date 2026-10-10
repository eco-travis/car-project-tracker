import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Cayenne Project Tracker</CardTitle>
          <CardDescription>
            We&apos;ll email you a sign-in link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error === "link" && (
            <p role="alert" className="text-destructive mb-4 text-sm">
              That sign-in link is invalid or expired. Request a new one.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
