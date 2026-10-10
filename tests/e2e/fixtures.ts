import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient } from "../support/local-supabase";
import { seedPhaseNames } from "@/lib/domain/phases";

export type E2EUser = {
  id: string;
  email: string;
  /** Signs the browser in via a server-generated magic link (skips email). */
  signIn: (page: Page) => Promise<void>;
  /** Creates the vehicle and seeded phases directly, bypassing onboarding. */
  createVehicle: (name?: string) => Promise<void>;
};

export async function createE2EUser(
  email = `e2e-${randomUUID()}@test.local`,
): Promise<E2EUser> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  return {
    id,
    email,
    async signIn(page) {
      const { data: link, error: linkError } =
        await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (linkError) throw linkError;
      await page.goto(
        `/auth/callback?token_hash=${link.properties.hashed_token}&type=email`,
      );
    },
    async createVehicle(name = "Test Cayenne") {
      const { data: vehicle, error: vErr } = await admin
        .from("vehicles")
        .insert({ owner_id: id, name })
        .select("id")
        .single();
      if (vErr) throw vErr;
      const { error: pErr } = await admin.from("phases").insert(
        seedPhaseNames().map((n, i) => ({
          owner_id: id,
          vehicle_id: vehicle.id,
          name: n,
          sort_order: i + 1,
        })),
      );
      if (pErr) throw pErr;
    },
  };
}

export const test = base.extend<{ user: E2EUser }>({
  // A fresh, isolated user per test; deleted afterwards (rows cascade).
  user: async ({}, provide) => {
    const user = await createE2EUser();
    await provide(user);
    await adminClient().auth.admin.deleteUser(user.id);
  },
});

export { expect };
