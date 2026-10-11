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
  createVehicle: (name?: string, odometer?: number) => Promise<SeededVehicle>;
};

export type SeededVehicle = {
  id: string;
  phases: { id: string; name: string }[];
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
    async createVehicle(name = "Test Cayenne", odometer = 0) {
      const { data: vehicle, error: vErr } = await admin
        .from("vehicles")
        .insert({ owner_id: id, name, current_odometer: odometer })
        .select("id")
        .single();
      if (vErr) throw vErr;
      const { data: phases, error: pErr } = await admin
        .from("phases")
        .insert(
          seedPhaseNames().map((n, i) => ({
            owner_id: id,
            vehicle_id: vehicle.id,
            name: n,
            sort_order: i + 1,
          })),
        )
        .select("id, name, sort_order")
        .order("sort_order");
      if (pErr) throw pErr;
      return {
        id: vehicle.id,
        phases: phases.map(({ id, name }) => ({ id, name })),
      };
    },
  };
}

export const test = base.extend<{ user: E2EUser }>({
  // Full page loads wait for React to hydrate, so tests never type into a not-yet-live form.
  page: async ({ page }, provide) => {
    const waitForHydration = () =>
      page.waitForSelector("html[data-hydrated]", { state: "attached" });
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await waitForHydration();
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await waitForHydration();
      return response;
    };
    // Server/client render mismatches are bugs even when the page looks fine; fail the test.
    const hydrationErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat/i.test(m.text()))
        hydrationErrors.push(m.text().slice(0, 300));
    });
    await provide(page);
    expect(hydrationErrors, "hydration errors in the browser console").toEqual(
      [],
    );
  },
  // A fresh, isolated user per test; deleted afterwards (rows cascade).
  user: async ({}, provide) => {
    const user = await createE2EUser();
    await provide(user);
    await adminClient().auth.admin.deleteUser(user.id);
  },
});

export { expect };

/** Inserts a job owned by `user` (service role; bypasses the UI). */
export async function seedJob(
  user: E2EUser,
  vehicle: SeededVehicle,
  values: {
    title: string;
    type?: "maintenance" | "repair" | "modification" | "diagnosis";
  } & Record<string, unknown>,
) {
  const { data, error } = await adminClient()
    .from("jobs")
    .insert({
      owner_id: user.id,
      vehicle_id: vehicle.id,
      type: "modification",
      ...values,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Inserts any row owned by `user` (service role; bypasses the UI). */
export async function seedRow(
  user: E2EUser,
  table: "parts" | "tools" | "tasks" | "task_links" | "expenses" | "job_tools",
  values: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await adminClient()
    .from(table)
    .insert({ owner_id: user.id, ...values } as never)
    .select("*")
    .single();
  if (error) throw error;
  return (data as { id?: string }).id ?? "";
}
