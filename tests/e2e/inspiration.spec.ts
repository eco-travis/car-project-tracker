import { adminClient } from "../support/local-supabase";
import { baseJpeg } from "../support/jpeg";
import { test, expect, seedPhoto } from "./fixtures";

test("spec flow 4: add an idea with an image, then promote it to a part and a job; the card keeps the links", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Flow 4");
  await user.signIn(page);
  await page.goto("/inspiration");

  await page.getByRole("button", { name: "Add idea" }).click();
  const dialog = page.getByRole("dialog", { name: "Add idea" });
  await dialog.getByLabel("Title").fill("Rival skid plate set");
  await dialog
    .getByLabel("Source link")
    .fill("https://forum.example/thread/123");
  await dialog.getByLabel("Tags").fill("Armor, skid");
  await dialog.getByLabel("Notes").fill("Looks bombproof");
  const chooser = page.waitForEvent("filechooser");
  await dialog
    .getByRole("button", { name: "Add images or screenshots" })
    .click();
  await (
    await chooser
  ).setFiles({ name: "skid.jpg", mimeType: "image/jpeg", buffer: baseJpeg() });
  await dialog.getByRole("button", { name: "Add idea" }).click();
  await expect(dialog).toBeHidden();

  const card = page.getByRole("article", { name: "Rival skid plate set" });
  await expect(card).toContainText("forum.example");
  await expect(card.getByRole("list", { name: "Tags" })).toContainText("armor");
  await expect(
    card.getByRole("button", { name: "Images for Rival skid plate set" }),
  ).toContainText("1");

  // Promote to part (Wishlist).
  await card
    .getByRole("button", { name: "Promote Rival skid plate set to part" })
    .click();
  await page
    .getByRole("dialog", { name: "Promote to part" })
    .getByRole("button", { name: "Create part" })
    .click();
  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "wishlist",
  );
  await expect(page.getByText("From idea Rival skid plate set")).toBeVisible();

  // Promote to job (Not started) in a phase.
  await page.goto("/inspiration");
  await card
    .getByRole("button", { name: "Promote Rival skid plate set to job" })
    .click();
  const jobDialog = page.getByRole("dialog", { name: "Promote to job" });
  await jobDialog
    .getByLabel("Phase")
    .selectOption({ label: "Armor and recovery" });
  await jobDialog.getByRole("button", { name: "Create job" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "not_started",
  );
  await expect(page.getByText("Plan / Armor and recovery")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "https://forum.example/thread/123" }),
  ).toBeVisible();

  // The card shows both links.
  await page.goto("/inspiration");
  await expect(
    card.getByRole("link", { name: "Rival skid plate set" }).first(),
  ).toBeVisible();
  await expect(card).toContainText("Part:");
  await expect(card).toContainText("Job:");

  // Inspiration images never reach the Gallery.
  await page.goto("/gallery");
  await expect(page.getByText("No photos yet.")).toBeVisible();
  void vehicle;
});

test("promoting again asks for confirmation before replacing the link (rule 19)", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Rule 19");
  const admin = adminClient();
  const { data: part } = await admin
    .from("parts")
    .insert({
      owner_id: user.id,
      vehicle_id: vehicle.id,
      name: "Old part",
      status: "wishlist",
    })
    .select("id")
    .single();
  const { data: insp } = await admin
    .from("inspirations")
    .insert({
      owner_id: user.id,
      vehicle_id: vehicle.id,
      title: "Light bar",
      promoted_part_id: part!.id,
    })
    .select("id")
    .single();
  await user.signIn(page);
  await page.goto("/inspiration");

  const card = page.getByRole("article", { name: "Light bar" });
  await card.getByRole("button", { name: "Promote Light bar to part" }).click();
  await page
    .getByRole("dialog", { name: "Promote to part" })
    .getByRole("button", { name: "Create part" })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Replace the linked part?",
  });
  await expect(confirm).toContainText("already links to a part");

  // Keeping the link changes nothing.
  await confirm.getByRole("button", { name: "Keep the current link" }).click();
  let { data: row } = await admin
    .from("inspirations")
    .select("promoted_part_id")
    .eq("id", insp!.id)
    .single();
  expect(row!.promoted_part_id).toBe(part!.id);

  // Confirming creates a new part and relinks.
  await card.getByRole("button", { name: "Promote Light bar to part" }).click();
  await page
    .getByRole("dialog", { name: "Promote to part" })
    .getByRole("button", { name: "Create part" })
    .click();
  await page
    .getByRole("dialog", { name: "Replace the linked part?" })
    .getByRole("button", { name: "Create new part" })
    .click();
  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  ({ data: row } = await admin
    .from("inspirations")
    .select("promoted_part_id")
    .eq("id", insp!.id)
    .single());
  expect(row!.promoted_part_id).not.toBe(part!.id);
  const { count } = await admin
    .from("parts")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);
  expect(count).toBe(2); // the old part stays
});

test("tag filter shows only matching ideas", async ({ page, user }) => {
  const vehicle = await user.createVehicle("Tags");
  const admin = adminClient();
  await admin.from("inspirations").insert([
    {
      owner_id: user.id,
      vehicle_id: vehicle.id,
      title: "Roof tent",
      tags: ["sleep system"],
    },
    {
      owner_id: user.id,
      vehicle_id: vehicle.id,
      title: "Ditch lights",
      tags: ["lighting"],
    },
  ]);
  const { data: tent } = await admin
    .from("inspirations")
    .select("id")
    .eq("title", "Roof tent")
    .single();
  await seedPhoto(user, vehicle, {
    inspiration_id: tent!.id,
    taken_at: "2026-09-01T17:00:00Z",
  });
  await user.signIn(page);
  await page.goto("/inspiration");
  await expect(page.getByRole("article")).toHaveCount(2);
  await page
    .getByRole("navigation", { name: "Filter by tag" })
    .getByRole("link", { name: "lighting" })
    .click();
  await expect(page).toHaveURL(/tag=lighting/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Ditch lights");
});
