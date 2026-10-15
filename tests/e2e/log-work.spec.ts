import { adminClient } from "../support/local-supabase";
import { baseJpeg } from "../support/jpeg";
import { seedPhaseNames } from "@/lib/domain/phases";
import { test, expect } from "./fixtures";

const PHASE = seedPhaseNames()[0];

test("log finished work from the Work Log in one step", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Log work", 141000);
  await user.signIn(page);
  await page.goto("/log");
  await expect(
    page.getByText("No done jobs yet.", { exact: false }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log work" }).click();
  const dialog = page.getByRole("dialog", { name: "Log work" });
  // Pre-filled like Mark done: today and the current odometer.
  await expect(dialog.getByLabel("Odometer (miles)")).toHaveValue("141000");
  await expect(dialog.getByLabel("Completed on")).not.toHaveValue("");

  await dialog.getByRole("button", { name: "Log work" }).click();
  await expect(dialog.getByText("Give the job a title.")).toBeVisible();

  await dialog.getByLabel("What was done").fill("Brake fluid flush");
  await dialog.getByLabel("Phase").selectOption({ label: PHASE });
  await dialog.getByLabel("Completed on").fill("2026-10-05");
  await dialog.getByLabel("Odometer (miles)").fill("141320");
  await dialog.getByLabel("DIY hours").fill("1.5");
  await dialog.getByLabel("Notes").fill("ATE Typ 200");
  await dialog.getByRole("button", { name: "Log work" }).click();

  const done = page.getByRole("dialog", { name: "Work logged" });
  await expect(done).toContainText("“Brake fluid flush” is in the Work Log.");
  const chooser = page.waitForEvent("filechooser");
  await done.getByRole("button", { name: "Add photos" }).click();
  await (
    await chooser
  ).setFiles({ name: "after.jpg", mimeType: "image/jpeg", buffer: baseJpeg() });
  await expect(done.getByRole("status")).toHaveText("Photos added.");
  await done.getByRole("button", { name: "Done" }).click();

  const log = page.getByRole("list", { name: "Done jobs, newest first" });
  await expect(log.getByRole("listitem")).toHaveCount(1);
  await expect(log).toContainText("Brake fluid flush");
  await expect(log).toContainText("141,320 mi");
  await expect(log).toContainText(`Maintenance · ${PHASE}`);

  const admin = adminClient();
  const { data: job } = await admin
    .from("jobs")
    .select(
      "id, status, completed_on, completed_odometer, performed_by, diy_hours, notes",
    )
    .eq("owner_id", user.id)
    .single();
  expect(job).toMatchObject({
    status: "done",
    completed_on: "2026-10-05",
    completed_odometer: 141320,
    performed_by: "diy",
    diy_hours: 1.5,
    notes: "ATE Typ 200",
  });
  const { data: v } = await admin
    .from("vehicles")
    .select("current_odometer")
    .eq("id", vehicle.id)
    .single();
  expect(v!.current_odometer).toBe(141320); // rule 14: a higher reading raises it
  const { data: photos } = await admin
    .from("attachments")
    .select("tag")
    .eq("job_id", job!.id);
  expect(photos).toEqual([{ tag: "after" }]);
});
