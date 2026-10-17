import { adminClient } from "../support/local-supabase";
import { todayIso } from "@/lib/domain/dates";
import { test, expect, seedJob, seedRow } from "./fixtures";

test("Installed on: entered on the form, defaulted to today, shown on the part and list", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Install dates");
  await user.signIn(page);
  await page.goto("/parts");

  await page.getByRole("button", { name: "Add part" }).click();
  const dialog = page.getByRole("dialog", { name: "Add part" });
  await expect(dialog.getByLabel("Installed on")).toHaveCount(0); // only for Installed parts
  await dialog.getByLabel("Name", { exact: true }).fill("Skid plate");
  await dialog.getByLabel("Status", { exact: true }).selectOption("installed");
  await dialog.getByLabel("Cost", { exact: true }).fill("540");
  await dialog.getByLabel("Installed on").fill("2026-09-28");
  await dialog.getByRole("button", { name: "Add part" }).click();
  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: "Details" })).toContainText(
    "Installed on",
  );
  await expect(page.getByRole("region", { name: "Details" })).toContainText(
    "Sep 28, 2026",
  );

  // Switching a part to Installed with the status control dates it today.
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Rock sliders",
    status: "received",
  });
  await page.goto(`/parts/${partId}`);
  await page
    .getByRole("region", { name: "Status and actions" })
    .getByLabel("Status")
    .selectOption("installed");
  await expect
    .poll(
      async () =>
        (
          await adminClient()
            .from("parts")
            .select("installed_on")
            .eq("id", partId)
            .single()
        ).data!.installed_on,
    )
    .toBe(todayIso());
  // ...and the date can be changed right there.
  const installedOn = page
    .getByRole("region", { name: "Status and actions" })
    .getByLabel("Installed on");
  await expect(installedOn).toHaveValue(todayIso());
  await installedOn.fill("2026-09-20");
  await expect
    .poll(
      async () =>
        (
          await adminClient()
            .from("parts")
            .select("installed_on")
            .eq("id", partId)
            .single()
        ).data!.installed_on,
    )
    .toBe("2026-09-20");
  await page.reload();
  await expect(page.getByRole("region", { name: "Details" })).toContainText(
    "Sep 20, 2026",
  );

  await page.goto("/parts");
  const row = page
    .getByRole("table", { name: "Parts" })
    .getByRole("row")
    .filter({ hasText: "Skid plate" });
  await expect(row).toContainText("Sep 28, 2026");
});

test("Mark done's install offer dates parts with the job's completion date", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Install via job", 141000);
  const jobId = await seedJob(user, vehicle, {
    title: "Fit sliders",
    type: "modification",
    status: "in_progress",
  });
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Rock sliders",
    status: "received",
    job_id: jobId,
  });
  await user.signIn(page);
  await page.goto(`/jobs/${jobId}`);
  await page.getByRole("button", { name: "Mark done" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark job done" });
  await dialog.getByLabel("Completed on").fill("2026-10-02");
  await dialog.getByRole("button", { name: "Mark done" }).click();
  await page.getByRole("button", { name: "Mark installed" }).click();
  await expect(page.getByText("Parts marked Installed.")).toBeVisible();
  const { data } = await adminClient()
    .from("parts")
    .select("status, installed_on")
    .eq("id", partId)
    .single();
  expect(data).toEqual({ status: "installed", installed_on: "2026-10-02" });
});
