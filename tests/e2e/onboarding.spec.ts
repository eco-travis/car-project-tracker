import { adminClient } from "../support/local-supabase";
import { test, expect } from "./fixtures";

test("onboarding creates the vehicle and five seeded phases, then / goes to the dashboard", async ({
  page,
  user,
}) => {
  await user.signIn(page);
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Name").fill("2004 Cayenne Turbo");
  await page.getByLabel("Year").fill("2004");
  await page.getByLabel("Generation").fill("955");
  await page.getByLabel("Current odometer (miles)").fill("141,250");
  await page.getByLabel("Purchase price ($)").fill("12,500");
  await page.getByRole("button", { name: "Create vehicle" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();

  const admin = adminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("*")
    .eq("owner_id", user.id)
    .single();
  expect(vehicle).toMatchObject({
    name: "2004 Cayenne Turbo",
    year: 2004,
    generation: "955",
    current_odometer: 141250,
    purchase_price_cents: 1250000,
  });
  const { data: phases } = await admin
    .from("phases")
    .select("name")
    .eq("owner_id", user.id)
    .order("sort_order");
  expect(phases?.map((p) => p.name)).toEqual([
    "Baseline maintenance",
    "Suspension and tires",
    "Armor and recovery",
    "Electrical and lighting",
    "Sleep and storage",
  ]);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("onboarding validates input before creating anything", async ({
  page,
  user,
}) => {
  await user.signIn(page);
  await page.getByLabel("Year").fill("abc");
  await page.getByLabel("Purchase price ($)").fill("12.345");
  await page.getByRole("button", { name: "Create vehicle" }).click();

  await expect(page.getByText("Give the vehicle a name.")).toBeVisible();
  await expect(page.getByText(/Year must be a whole number/)).toBeVisible();
  await expect(
    page.getByText(/Purchase price must be a dollar amount/),
  ).toBeVisible();
  const { count } = await adminClient()
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);
  expect(count).toBe(0);
});

test("app screens send a signed-in user without a vehicle to onboarding", async ({
  page,
  user,
}) => {
  await user.signIn(page);
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/onboarding$/);
});
