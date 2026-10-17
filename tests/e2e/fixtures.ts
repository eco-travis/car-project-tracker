import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient, deleteTestUser } from "../support/local-supabase";
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
    // App screens render inside a loading (Suspense) boundary: also wait for the screen itself.
    const waitForHydration = async () => {
      await page.waitForSelector("html[data-hydrated]", { state: "attached" });
      if (
        !/^\/(login|auth|onboarding|api)(\/|$)/.test(
          new URL(page.url()).pathname,
        )
      ) {
        await page.waitForSelector("html[data-page-ready]", {
          state: "attached",
        });
      }
    };
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
    // Hydration mismatches and duplicate keys are bugs even when the page looks fine; fail the test.
    const reactErrors: string[] = [];
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        /hydrat|two children with the same key/i.test(m.text())
      )
        reactErrors.push(m.text().slice(0, 300));
    });
    page.on("pageerror", (e) =>
      reactErrors.push(`Uncaught: ${e.message}`.slice(0, 300)),
    );
    await provide(page);
    expect(
      reactErrors,
      "Uncaught errors, hydration mismatches, or duplicate keys in the browser",
    ).toEqual([]);
  },
  // A fresh, isolated user per test; deleted afterwards (rows cascade; stored files removed).
  user: async ({}, provide) => {
    const user = await createE2EUser();
    await provide(user);
    await deleteTestUser(user);
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

/**
 * Uploads a real JPEG (and thumbnail) to local Storage and inserts its attachment row, as the
 * upload pipeline would. Returns the attachment id.
 */
export async function seedPhoto(
  user: E2EUser,
  vehicle: SeededVehicle,
  values: Record<string, unknown> & { taken_at: string },
): Promise<string> {
  const { baseJpeg } = await import("../support/jpeg");
  const admin = adminClient();
  const id = randomUUID();
  const path = `${user.id}/${id}/photo.jpg`;
  const thumb = `${user.id}/${id}/thumb.jpg`;
  for (const p of [path, thumb]) {
    const { error } = await admin.storage
      .from("attachments")
      .upload(p, baseJpeg(), { contentType: "image/jpeg" });
    if (error) throw error;
  }
  const { error } = await admin.from("attachments").insert({
    id,
    owner_id: user.id,
    vehicle_id: vehicle.id,
    storage_path: path,
    thumb_path: thumb,
    mime_type: "image/jpeg",
    size_bytes: baseJpeg().length,
    kind: "photo",
    ...values,
  } as never);
  if (error) throw error;
  return id;
}
