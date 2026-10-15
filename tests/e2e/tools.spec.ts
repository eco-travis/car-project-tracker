import { adminClient } from "../support/local-supabase";
import { test, expect, seedRow } from "./fixtures";

test("Add tool records whether it was bought for the project and what it cost", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Tools");
  await seedRow(user, "tools", {
    vehicle_id: vehicle.id,
    name: "Floor jack",
    status: "owned",
  });
  await user.signIn(page);
  await page.goto("/tools");

  await page.getByRole("button", { name: "Add tool" }).click();
  const dialog = page.getByRole("dialog", { name: "Add tool" });
  await expect(dialog.getByLabel("Storage location")).toHaveCount(0);
  await dialog.getByLabel("Name", { exact: true }).fill("Ball joint press");
  await dialog.getByLabel("Cost (optional)").fill("89.99");
  await dialog.getByLabel("Bought for this project").check();
  await dialog.getByRole("button", { name: "Add tool" }).click();
  await expect(dialog).toBeHidden();

  const table = page.getByRole("table", { name: "Tools" });
  const row = table.getByRole("row").filter({ hasText: "Ball joint press" });
  await expect(row).toContainText("$89.99");
  await expect(
    page.getByText("Bought for this project: 1 tool, $89.99"),
  ).toBeVisible();

  const admin = adminClient();
  const { data: tool } = await admin
    .from("tools")
    .select("id, bought_for_project")
    .eq("name", "Ball joint press")
    .eq("owner_id", user.id)
    .single();
  expect(tool!.bought_for_project).toBe(true);
  const { data: expense } = await admin
    .from("expenses")
    .select("amount_cents, category, state")
    .eq("tool_id", tool!.id)
    .single();
  expect(expense).toEqual({
    amount_cents: 8999,
    category: "tool",
    state: "paid",
  });

  // Filter to project purchases.
  await page.getByLabel("Bought for this project").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/project=1/);
  await expect(
    table.getByRole("row").filter({ hasText: "Floor jack" }),
  ).toHaveCount(0);
  await expect(row).toBeVisible();

  // Edit can flip the flag; it has no Cost field (later costs are expenses).
  await row.getByRole("button", { name: "Edit Ball joint press" }).click();
  const edit = page.getByRole("dialog", { name: "Edit tool" });
  await expect(edit.getByLabel("Cost (optional)")).toHaveCount(0);
  await expect(edit.getByLabel("Bought for this project")).toBeChecked();
  await edit.getByLabel("Bought for this project").uncheck();
  await edit.getByRole("button", { name: "Save tool" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByText("No tools match these filters.")).toBeVisible();
});
