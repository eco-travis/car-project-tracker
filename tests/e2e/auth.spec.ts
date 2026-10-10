import { test, expect } from "@playwright/test";
import { deleteMessagesTo, firstLink, messagesTo } from "./support/mailpit";

const allowedEmail = process.env.ALLOWED_EMAIL!;

test.describe("sign-in gate (M1)", () => {
  // Requesting a link invalidates the previous one, so run against the one allowed inbox serially.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Uses the shared allowed inbox; desktop only",
    );
  });
  test.skip(!allowedEmail, "ALLOWED_EMAIL must be set (see .env.example)");

  test("redirects signed-out visitors to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("returns 401 for API routes without a session", async ({ request }) => {
    const res = await request.get("/api/exports/xlsx");
    expect(res.status()).toBe(401);
  });

  test("rejects any other email and sends nothing", async ({ page }) => {
    const stranger = `stranger-${Date.now()}@example.com`;
    await page.goto("/login");
    await page.getByLabel("Email").fill(stranger);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "That email can't sign in to this tracker.",
    );
    expect(await messagesTo(stranger)).toHaveLength(0);
  });

  test("emails the allowed address a link that signs in", async ({ page }) => {
    await deleteMessagesTo(allowedEmail);
    await page.goto("/login");
    await page.getByLabel("Email").fill(allowedEmail.toUpperCase());
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("status")).toContainText("Check");

    await expect
      .poll(async () => (await messagesTo(allowedEmail)).length, {
        timeout: 10_000,
      })
      .toBe(1);
    const [message] = await messagesTo(allowedEmail);
    const link = await firstLink(message.ID);
    expect(link).toContain("/auth/callback?token_hash=");

    await page.goto(link);
    await expect(page).toHaveURL(/\/(onboarding|dashboard)$/);

    // Signed-in users skip the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/(onboarding|dashboard)$/);
  });

  test("shows an error for an invalid link", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=bogus&type=email");
    await expect(page).toHaveURL(/\/login\?error=link$/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "invalid or expired",
    );
  });
});
