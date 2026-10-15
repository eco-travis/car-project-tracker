import { adminClient } from "../support/local-supabase";
import { test, expect, seedPhoto, seedRow } from "./fixtures";

test("delete a part from the Parts list: confirm first; expenses stay, files go, task links are removed", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Delete parts");
  const admin = adminClient();
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Spare fuel pump",
    brand: "Bosch",
    status: "received",
  });
  await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Keep me",
    status: "idea",
  });
  const expenseId = await seedRow(user, "expenses", {
    vehicle_id: vehicle.id,
    spent_on: "2026-10-01",
    amount_cents: 21900,
    category: "part",
    part_id: partId,
  });
  const photoId = await seedPhoto(user, vehicle, {
    part_id: partId,
    taken_at: "2026-10-01T17:00:00Z",
  });
  const taskId = await seedRow(user, "tasks", {
    vehicle_id: vehicle.id,
    title: "Return spare pump?",
  });
  await seedRow(user, "task_links", { task_id: taskId, part_id: partId });
  const { data: photo } = await admin
    .from("attachments")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  await user.signIn(page);
  await page.goto("/parts");

  const table = page.getByRole("table", { name: "Parts" });
  const row = table
    .getByRole("row")
    .filter({ hasText: "Bosch Spare fuel pump" });

  // Cancel keeps it.
  await row
    .getByRole("button", { name: "Delete Bosch Spare fuel pump" })
    .click();
  const confirm = page.getByRole("alertdialog", { name: "Delete part" });
  await expect(confirm).toContainText(
    "Expenses linked to it stay in the ledger, unlinked.",
  );
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(row).toBeVisible();

  // Confirm deletes it.
  await row
    .getByRole("button", { name: "Delete Bosch Spare fuel pump" })
    .click();
  await page
    .getByRole("alertdialog", { name: "Delete part" })
    .getByRole("button", { name: "Delete part" })
    .click();
  await expect(row).toHaveCount(0);
  await expect(
    table.getByRole("row").filter({ hasText: "Keep me" }),
  ).toBeVisible();

  const { count: parts } = await admin
    .from("parts")
    .select("*", { count: "exact", head: true })
    .eq("id", partId);
  expect(parts).toBe(0);
  const { data: expense } = await admin
    .from("expenses")
    .select("part_id, amount_cents")
    .eq("id", expenseId)
    .single();
  expect(expense).toEqual({ part_id: null, amount_cents: 21900 }); // money history kept
  const folder = photo!.storage_path.split("/").slice(0, 2).join("/");
  const { data: objects } = await admin.storage
    .from("attachments")
    .list(folder);
  expect(objects).toEqual([]); // stored files removed, not orphaned
  const { data: task } = await admin
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .single();
  expect(task!.id).toBe(taskId);
  const { count: links } = await admin
    .from("task_links")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId);
  expect(links).toBe(0);
});

test("deleting from the part page returns to the Parts list", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Delete from page");
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Old bracket",
  });
  await user.signIn(page);
  await page.goto(`/parts/${partId}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("alertdialog", { name: "Delete part" })
    .getByRole("button", { name: "Delete part" })
    .click();
  await expect(page).toHaveURL(/\/parts$/);
  await expect(page.getByText("No parts yet.", { exact: false })).toBeVisible();
});
