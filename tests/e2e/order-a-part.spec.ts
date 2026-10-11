import { adminClient } from "../support/local-supabase";
import { test, expect, seedJob, seedRow } from "./fixtures";

test.describe("spec flow 3: order a part", () => {
  test("an expense moves the part to Ordered and shows as Committed, then Paid, on its job and phase", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 3");
    const suspension = vehicle.phases[1];
    await adminClient()
      .from("phases")
      .update({ budget_cents: 100000 })
      .eq("id", suspension.id);
    const jobId = await seedJob(user, vehicle, {
      title: "Install lift spacers",
      phase_id: suspension.id,
      budget_cents: 60000,
    });
    const partId = await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      job_id: jobId,
      name: "2in lift spacers",
      brand: "Rennen",
      status: "wishlist",
      vendor: "FCP Euro",
    });
    await user.signIn(page);

    await page.goto(`/parts/${partId}`);
    await page.getByRole("button", { name: "Add expense" }).click();
    const dialog = page.getByRole("dialog", { name: "Add expense" });
    await expect(dialog.getByLabel("Vendor")).toHaveValue("FCP Euro");
    await expect(dialog.getByLabel("State")).toHaveValue("committed");
    await dialog.getByLabel("Amount ($)").fill("450");
    await dialog.getByRole("button", { name: "Add expense" }).click();
    await expect(dialog).toBeHidden();

    // Rule 6.
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "ordered",
    );

    // Committed on the job (part-only expense counts toward the part's job).
    await page.goto(`/jobs/${jobId}`);
    const costs = page.getByRole("region", { name: "Costs" });
    await expect(costs).toContainText("Budget$600.00");
    await expect(costs).toContainText("Committed$450.00");
    await expect(costs).toContainText("Paid$0.00");
    await expect(costs).toContainText("Remaining$150.00");

    // Marking it paid moves it from committed to paid.
    await costs.getByRole("button", { name: /Mark .* paid/ }).click();
    await expect(costs).toContainText("Committed$0.00");
    await expect(costs).toContainText("Paid$450.00");

    // Over budget shows the overage amount (rule 12).
    await costs.getByRole("button", { name: "Add expense" }).click();
    const more = page.getByRole("dialog", { name: "Add expense" });
    await more.getByLabel("Amount ($)").fill("200");
    await more.getByLabel("Category").selectOption("shop_labor_bay");
    await more.getByRole("button", { name: "Add expense" }).click();
    await expect(more).toBeHidden();
    await expect(costs).toContainText("Over by$50.00");

    // The plan shows the same money at phase and job level.
    await page.goto("/plan");
    const phase = page.getByRole("region", { name: /Suspension and tires/ });
    await expect(phase).toContainText("Budget$1,000.00");
    await expect(phase).toContainText("Paid$650.00");
    await expect(phase).toContainText("Remaining$350.00");
    await expect(
      phase.getByRole("listitem").filter({ hasText: "Install lift spacers" }),
    ).toContainText("Over by$50.00");
  });

  test("the phase header lists parts not ordered and tools to buy", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Missing");
    const armor = vehicle.phases[2];
    const jobId = await seedJob(user, vehicle, {
      title: "Skid plates",
      phase_id: armor.id,
    });
    await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      job_id: jobId,
      name: "Front skid",
      status: "idea",
    });
    await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      job_id: jobId,
      name: "Bolts",
      status: "received",
    });
    await user.signIn(page);

    await page.goto(`/jobs/${jobId}`);
    await page.getByRole("button", { name: "New tool" }).click();
    const dialog = page.getByRole("dialog", { name: "Add tool" });
    await dialog.getByLabel("Name").fill("Torque wrench 3/8in");
    await dialog.getByLabel("Status").selectOption("need_to_buy");
    await dialog.getByRole("button", { name: "Add tool" }).click();
    await expect(
      page.getByRole("region", { name: "Tools needed" }),
    ).toContainText("Need to buy: Torque wrench 3/8in");

    await page.goto("/plan");
    await expect(
      page.getByRole("region", { name: /Armor and recovery/ }),
    ).toContainText("Missing: 1 part not ordered · 1 tool to buy");
  });

  test("parts search matches superseded part numbers, with or without dashes", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Search");
    await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      name: "Coolant pipe kit",
      oem_part_number: "948-106-052-00",
      superseded_numbers: ["948-106-052-01"],
    });
    await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      name: "Spark plug",
      oem_part_number: "999-170-232-90",
    });
    await user.signIn(page);
    await page.goto("/parts");
    await page.getByRole("searchbox", { name: "Search" }).fill("94810605201");
    await page.getByRole("button", { name: "Apply" }).click();
    const table = page.getByRole("table", { name: "Parts" });
    await expect(table.getByRole("link")).toHaveText(["Coolant pipe kit"]);
  });
});
