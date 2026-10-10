import { adminClient } from "../support/local-supabase";
import { test, expect, seedJob } from "./fixtures";

test.describe("spec flow 5: plan a phase (jobs and blockers)", () => {
  test("create a phase with a budget, add jobs, set blocked-by, and see what's blocking", async ({
    page,
    user,
  }) => {
    await user.createVehicle("Flow 5");
    await user.signIn(page);
    await page.goto("/plan");

    // Create the phase.
    await page.getByRole("button", { name: "Add phase" }).click();
    const phaseDialog = page.getByRole("dialog", { name: "Add phase" });
    await phaseDialog.getByLabel("Name").fill("Roof rack and lights");
    await phaseDialog.getByLabel("Budget ($)").fill("2,400");
    await phaseDialog.getByRole("button", { name: "Add phase" }).click();
    await expect(phaseDialog).toBeHidden();
    const phase = page.getByRole("region", { name: /Roof rack and lights/ });
    await expect(phase).toContainText("$2,400.00");
    await expect(phase).toContainText(/^6\./); // appended after the five seeded phases

    // Add two jobs to it.
    for (const title of ["Install roof rack", "Wire light bar"]) {
      await phase
        .getByRole("button", { name: "Add job to Roof rack and lights" })
        .click();
      const jobDialog = page.getByRole("dialog", { name: "Add job" });
      await expect(jobDialog.getByLabel("Phase")).toHaveValue(/.+/);
      await jobDialog.getByLabel("Title").fill(title);
      await jobDialog.getByLabel("Type").selectOption("modification");
      await jobDialog.getByRole("button", { name: "Add job" }).click();
      await expect(jobDialog).toBeHidden();
      await expect(phase.getByRole("link", { name: title })).toBeVisible();
    }

    // Light bar is blocked by the rack.
    await phase.getByRole("link", { name: "Wire light bar" }).click();
    await page
      .getByLabel("Add a blocking job")
      .selectOption({ label: "Install roof rack" });
    await page.getByRole("button", { name: "Add blocker" }).click();
    await expect(
      page
        .getByRole("region", { name: "Dependencies" })
        .getByRole("link", { name: "Install roof rack" }),
    ).toBeVisible();

    // Rule 2 guard, naming the blocker.
    await page.getByLabel("Status", { exact: true }).selectOption("ready");
    await expect(
      page.getByRole("alert").filter({ hasText: "Blocked by" }),
    ).toHaveText('Blocked by "Install roof rack". Finish or remove it first.');
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "not_started",
    );

    // The plan shows the blocked job with its blocker's name, and the phase header says what's missing.
    await page.goto("/plan");
    await expect(phase.getByText("Blocked by Install roof rack")).toBeVisible();
    await expect(phase).toContainText("Missing: 1 job is blocked");

    // Rule 5: no cycles.
    await phase
      .getByRole("link", { name: "Install roof rack" })
      .first()
      .click();
    await page
      .getByLabel("Add a blocking job")
      .selectOption({ label: "Wire light bar" });
    await page.getByRole("button", { name: "Add blocker" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "loop" }),
    ).toBeVisible();

    // Finishing the blocker unblocks the job.
    await page.getByRole("button", { name: "Mark done" }).click();
    await page
      .getByRole("dialog", { name: "Mark job done" })
      .getByRole("button", { name: "Mark done" })
      .click();
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "done",
    );
    await page.goto("/plan");
    await expect(phase.getByText("Blocked by")).toHaveCount(0);
  });

  test("deleting a phase names its job count and keeps the jobs, unphased", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Delete phase");
    const armor = vehicle.phases.find((p) => p.name === "Armor and recovery")!;
    await seedJob(user, vehicle, { title: "Skid plates", phase_id: armor.id });
    await seedJob(user, vehicle, { title: "Rock sliders", phase_id: armor.id });
    await user.signIn(page);
    await page.goto("/plan");

    const phase = page.getByRole("region", { name: /Armor and recovery/ });
    await phase.getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(
      'Delete "Armor and recovery"? Its 2 jobs will stay in the plan as unphased.',
    );
    await confirm.getByRole("button", { name: "Delete phase" }).click();

    await expect(phase).toHaveCount(0);
    const unphased = page.getByRole("region", { name: "Unphased" });
    await expect(
      unphased.getByRole("link", { name: "Skid plates" }),
    ).toBeVisible();
    await expect(
      unphased.getByRole("link", { name: "Rock sliders" }),
    ).toBeVisible();
  });

  test("phases reorder by keyboard drag and the order persists", async ({
    page,
    user,
  }) => {
    await user.createVehicle("Reorder");
    await user.signIn(page);
    await page.goto("/plan");
    const phases = page
      .getByRole("list", { name: "Phases" })
      .getByRole("heading", { level: 2 });
    await expect(phases.first()).toContainText("Baseline maintenance");

    const handle = page.getByRole("button", {
      name: "Reorder Baseline maintenance",
    });
    await handle.focus();
    // dnd-kit's keyboard sensor needs a beat between pick up, move, and drop.
    for (const key of ["Space", "ArrowDown", "Space"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
    }
    await expect(
      page.getByText("Baseline maintenance was dropped at position 2 of 5."),
    ).toBeAttached();

    await expect(phases.first()).toContainText("Suspension and tires");
    await expect(phases.nth(1)).toContainText("Baseline maintenance");
    await expect
      .poll(async () => {
        const { data } = await adminClient()
          .from("phases")
          .select("name")
          .eq("owner_id", user.id)
          .order("sort_order");
        return data?.slice(0, 2).map((p) => p.name);
      })
      .toEqual(["Suspension and tires", "Baseline maintenance"]);
    await page.reload();
    await expect(phases.first()).toContainText("Suspension and tires");
  });
});
