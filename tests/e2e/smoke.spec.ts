import { expect, test } from "@playwright/test";

test("placeholder page renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cayenne Project Tracker" }),
  ).toBeVisible();
});
