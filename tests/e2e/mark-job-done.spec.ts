import { adminClient } from "../support/local-supabase";
import { todayIso } from "@/lib/domain/dates";
import { formatDate } from "@/lib/format";
import { test, expect, seedJob } from "./fixtures";

test.describe("spec flow 2: mark job done", () => {
  test("pre-fills today and the odometer, raises the odometer, and offers to install received parts", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 2", 141000);
    const jobId = await seedJob(user, vehicle, {
      title: "Replace transfer case fluid",
      type: "maintenance",
      phase_id: vehicle.phases[0].id,
    });
    const admin = adminClient();
    const { data: part } = await admin
      .from("parts")
      .insert({
        owner_id: user.id,
        vehicle_id: vehicle.id,
        job_id: jobId,
        name: "ATF 3309",
        status: "received",
      })
      .select("id")
      .single();
    await user.signIn(page);

    await page.goto(`/jobs/${jobId}`);
    await page.getByRole("button", { name: "Mark done" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark job done" });
    await expect(dialog.getByLabel("Completed on")).toHaveValue(todayIso());
    await expect(dialog.getByLabel("Odometer (miles)")).toHaveValue("141000");

    await dialog.getByLabel("Odometer (miles)").fill("141250");
    await dialog.getByLabel("Performed by").selectOption("diy");
    await dialog.getByLabel("DIY hours").fill("1.5");
    await dialog.getByRole("button", { name: "Mark done" }).click();

    // Rule 4: offered, not forced.
    const followUp = page.getByRole("dialog", { name: "Job marked done" });
    await expect(followUp).toContainText(
      "1 part on this job is marked Received",
    );
    await expect(followUp).toContainText("ATF 3309");
    await expect(
      followUp.getByRole("button", { name: "Add after photos" }),
    ).toBeVisible();
    await followUp.getByRole("button", { name: "Mark installed" }).click();
    await expect(followUp.getByRole("status")).toHaveText(
      "Parts marked Installed.",
    );
    await followUp.getByRole("button", { name: "Done" }).click();
    await expect(followUp).toBeHidden();

    const status = page.getByRole("region", { name: "Status and completion" });
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "done",
    );
    await expect(status).toContainText(formatDate(todayIso()));
    await expect(status).toContainText("141,250 mi");
    await expect(status).toContainText("DIY");

    const { data: v } = await admin
      .from("vehicles")
      .select("current_odometer")
      .eq("id", vehicle.id)
      .single();
    expect(v!.current_odometer).toBe(141250);
    const { data: p } = await admin
      .from("parts")
      .select("status")
      .eq("id", part!.id)
      .single();
    expect(p!.status).toBe("installed");

    await page.goto("/log");
    await expect(
      page.getByRole("link", { name: "Replace transfer case fluid" }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Done jobs, newest first" }),
    ).toContainText("141,250 mi");
  });

  test("requires a date and odometer", async ({ page, user }) => {
    const vehicle = await user.createVehicle("Flow 2 validation", 1000);
    const jobId = await seedJob(user, vehicle, {
      title: "Brake fluid flush",
      type: "maintenance",
    });
    await user.signIn(page);
    await page.goto(`/jobs/${jobId}`);
    await page.getByRole("button", { name: "Mark done" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark job done" });
    await dialog.getByLabel("Completed on").fill("");
    await dialog.getByLabel("Odometer (miles)").fill("");
    await dialog.getByRole("button", { name: "Mark done" }).click();
    await expect(
      dialog.getByText("Enter the date the job was finished."),
    ).toBeVisible();
    await expect(dialog.getByText("Enter the odometer reading.")).toBeVisible();
  });

  test("a lower reading doesn't lower the vehicle odometer", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 2 lower", 150000);
    const jobId = await seedJob(user, vehicle, {
      title: "Logging old work",
      type: "repair",
    });
    await user.signIn(page);
    await page.goto(`/jobs/${jobId}`);
    await page.getByRole("button", { name: "Mark done" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark job done" });
    await dialog.getByLabel("Completed on").fill("2025-06-01");
    await dialog.getByLabel("Odometer (miles)").fill("120000");
    await dialog.getByRole("button", { name: "Mark done" }).click();
    await page
      .getByRole("dialog", { name: "Job marked done" })
      .getByRole("button", { name: "Done" })
      .click();
    await expect(dialog).toBeHidden();
    const { data } = await adminClient()
      .from("vehicles")
      .select("current_odometer")
      .eq("id", vehicle.id)
      .single();
    expect(data!.current_odometer).toBe(150000);
  });
});
