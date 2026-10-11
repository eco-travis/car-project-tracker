import { adminClient } from "../support/local-supabase";
import { test, expect, seedJob, seedRow } from "./fixtures";

test("spec flow 6: sell a removed part, then close the linked task", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Flow 6");
  const jobId = await seedJob(user, vehicle, {
    title: "Wheel swap",
    type: "modification",
  });
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    job_id: jobId,
    name: "Stock 18in wheels",
    status: "removed",
  });
  const taskId = await seedRow(user, "tasks", {
    vehicle_id: vehicle.id,
    title: "Sell stock wheels to clear storage",
  });
  await seedRow(user, "task_links", { task_id: taskId, part_id: partId });
  await user.signIn(page);

  await page.goto(`/parts/${partId}`);
  await page.getByRole("button", { name: "Record sale" }).click();
  const dialog = page.getByRole("dialog", { name: "Record sale" });
  await dialog.getByLabel("Sale price ($)").fill("600");
  await dialog.getByLabel("Buyer or venue").fill("Rennlist classifieds");
  await dialog.getByRole("button", { name: "Record sale" }).click();

  const followUp = page.getByRole("dialog", { name: "Sale recorded" });
  await expect(followUp).toContainText("Sell stock wheels to clear storage");
  await followUp.getByRole("button", { name: "Mark done" }).click();
  await expect(followUp).toBeHidden();

  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("sold");
  await expect(page.getByRole("region", { name: "Expenses" })).toContainText(
    "Sold for $600.00",
  );
  await expect(page.getByRole("button", { name: "Record sale" })).toHaveCount(
    0,
  );

  const admin = adminClient();
  const { data: expense } = await admin
    .from("expenses")
    .select("amount_cents, category, state")
    .eq("part_id", partId)
    .single();
  expect(expense).toEqual({
    amount_cents: -60000,
    category: "sale",
    state: "paid",
  });
  const { data: task } = await admin
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();
  expect(task!.status).toBe("done");

  await page.goto("/vehicle");
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText("Recovered$600.00");
});

test("record sale is only offered for Removed parts", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Not removed");
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Installed part",
    status: "installed",
  });
  await user.signIn(page);
  await page.goto(`/parts/${partId}`);
  await expect(page.getByRole("button", { name: "Record sale" })).toHaveCount(
    0,
  );
  await page.getByLabel("Status", { exact: true }).selectOption("removed");
  await expect(page.getByRole("button", { name: "Record sale" })).toBeVisible();
});
