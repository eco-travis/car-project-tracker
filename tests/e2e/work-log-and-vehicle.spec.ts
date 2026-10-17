import { test, expect, seedJob } from "./fixtures";

test("work log lists done jobs newest first with type, phase, and text filters", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Log");
  const [baseline, suspension] = vehicle.phases;
  const done = (date: string, odo: number) => ({
    status: "done",
    completed_on: date,
    completed_odometer: odo,
  });
  await seedJob(user, vehicle, {
    title: "Oil change",
    type: "maintenance",
    phase_id: baseline.id,
    ...done("2026-03-01", 140000),
  });
  await seedJob(user, vehicle, {
    title: "Transfer case fluid",
    type: "maintenance",
    notes: "Used ATF 3309",
    ...done("2026-05-01", 140800),
  });
  await seedJob(user, vehicle, {
    title: "Lift spacers",
    type: "modification",
    phase_id: suspension.id,
    ...done("2026-07-01", 141500),
  });
  await seedJob(user, vehicle, { title: "Not done yet", type: "repair" });
  await user.signIn(page);

  await page.goto("/log");
  const list = page.getByRole("list", { name: "Done jobs, newest first" });
  await expect(list.getByRole("link")).toHaveText([
    "Lift spacers",
    "Transfer case fluid",
    "Oil change",
  ]);

  await page.getByLabel("Type").selectOption("maintenance");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(list.getByRole("link")).toHaveText([
    "Transfer case fluid",
    "Oil change",
  ]);

  await page.getByLabel("Phase").selectOption("none");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(list.getByRole("link")).toHaveText(["Transfer case fluid"]);

  await page.getByRole("link", { name: "Clear" }).click();
  // The filter form remounts when the URL changes; wait so typing isn't wiped mid-navigation.
  await expect(page).toHaveURL(/\/log$/);
  await expect(list.getByRole("link")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search" }).fill("3309");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(list.getByRole("link")).toHaveText(["Transfer case fluid"]);

  // LIKE wildcards in the search are literal.
  await page.getByRole("searchbox", { name: "Search" }).fill("%");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByText("No done jobs match these filters."),
  ).toBeVisible();
});

test("vehicle page saves notes and lets the odometer be corrected down", async ({
  page,
  user,
}) => {
  await user.createVehicle("Vehicle page", 141000);
  await user.signIn(page);
  await page.goto("/vehicle");

  await page.getByLabel("Current odometer (miles)").fill("140000");
  await page.getByRole("button", { name: "Update odometer" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Odometer set to 140,000 mi.",
  );

  await page.getByLabel("Current odometer (miles)").fill("141900");
  await page.getByRole("button", { name: "Update odometer" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Odometer set to 141,900 mi.",
  );

  await page
    .getByLabel("Notes", { exact: true })
    .fill("ATF: Pentosin ATF 1\nTransfer case: Porsche 000 043 300 56");
  await page.getByRole("button", { name: "Save vehicle" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    /Pentosin ATF 1/,
  );
  await expect(page.getByLabel("Current odometer (miles)")).toHaveValue(
    "141900",
  );
});

test("vehicle page records sales tax and licensing, counted in Total invested", async ({
  page,
  user,
}) => {
  await user.createVehicle("Purchase costs");
  await user.signIn(page);
  await page.goto("/vehicle");
  await page.getByLabel("Purchase price ($)").fill("12,500");
  await page.getByLabel("Sales tax ($)").fill("1,125.00");
  await page.getByLabel("Licensing and registration ($)").fill("418");
  await page.getByRole("button", { name: "Save vehicle" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." }),
  ).toBeVisible();

  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText("Total invested$14,043.00");
  await expect(money).toContainText("Sales tax$1,125.00");
  await expect(money).toContainText("Licensing and registration$418.00");
  await page.reload();
  await expect(page.getByLabel("Sales tax ($)")).toHaveValue("1125.00");

  await page.goto("/dashboard");
  await expect(page.getByText("$14,043.00").first()).toBeVisible();
});
