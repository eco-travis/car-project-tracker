import { NAV_ITEMS, BOTTOM_BAR_COUNT } from "@/components/shell/nav-items";
import { test, expect } from "./fixtures";

test.beforeEach(async ({ page, user }) => {
  await user.createVehicle("Nav Test Cayenne");
  await user.signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("desktop: sidebar reaches every screen", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const sidebar = page
    .locator("aside")
    .getByRole("navigation", { name: "Main" });
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "More" })).toBeHidden();
  await expect(page.locator("aside")).toContainText("Nav Test Cayenne");

  for (const { href, label } of NAV_ITEMS) {
    await sidebar.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("phone: bottom nav and More sheet reach every screen", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone");
  await expect(page.locator("aside")).toBeHidden();
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar).toBeVisible();

  for (const { href, label } of NAV_ITEMS.slice(0, BOTTOM_BAR_COUNT)) {
    await bar.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }

  for (const { href, label } of NAV_ITEMS.slice(BOTTOM_BAR_COUNT)) {
    await bar.getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog").getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("sign out returns to the login page", async ({ page }, info) => {
  if (info.project.name === "phone") {
    await page.getByRole("button", { name: "More" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sign out" })
      .click();
  } else {
    await page
      .locator("aside")
      .getByRole("button", { name: "Sign out" })
      .click();
  }
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
