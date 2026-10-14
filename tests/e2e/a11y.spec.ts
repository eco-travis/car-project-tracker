import AxeBuilder from "@axe-core/playwright";
import { adminClient } from "../support/local-supabase";
import { seedDemo } from "../support/demo-data";
import { test, expect, seedPhoto } from "./fixtures";

/** Every screen with the demo build loaded: no serious or critical axe violations (WCAG 2.1 A/AA). */
const SCREENS = [
  "/dashboard",
  "/plan",
  "/log",
  "/gallery",
  "/watch",
  "/tasks",
  "/parts",
  "/tools",
  "/inspiration",
  "/vehicle",
];

test.describe("accessibility (M9)", () => {
  test.beforeEach(async ({ user }) => {
    const { vehicle_id } = await seedDemo(adminClient(), user.id);
    const { data: job } = await adminClient()
      .from("jobs")
      .select("id")
      .eq("owner_id", user.id)
      .eq("title", "Coolant pipes")
      .single();
    await seedPhoto(
      user,
      { id: vehicle_id, phases: [] },
      {
        job_id: job!.id,
        highlight: true,
        tag: "before",
        taken_at: "2026-09-20T17:00:00Z",
      },
    );
  });

  for (const path of SCREENS) {
    test(`${path} has no serious accessibility violations`, async ({
      page,
      user,
    }) => {
      await user.signIn(page);
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map(
          (v) =>
            `${v.id}: ${v.help} (${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(" | ")})`,
        );
      expect(serious).toEqual([]);
    });
  }

  test("job, part, and watch item pages have no serious violations", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    const admin = adminClient();
    const { data: job } = await admin
      .from("jobs")
      .select("id")
      .eq("owner_id", user.id)
      .eq("title", "Install 2in lift spacers + alignment")
      .single();
    const { data: part } = await admin
      .from("parts")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", "Coolant pipe kit")
      .single();
    const { data: watch } = await admin
      .from("watch_items")
      .select("id")
      .eq("owner_id", user.id)
      .ilike("title", "Power steering%")
      .single();
    for (const path of [
      `/jobs/${job!.id}`,
      `/parts/${part!.id}`,
      `/watch/${watch!.id}`,
    ]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map(
            (v) =>
              `${path} ${v.id}: ${v.nodes
                .map((n) => n.target.join(" "))
                .slice(0, 3)
                .join(" | ")}`,
          ),
      ).toEqual([]);
    }
  });

  test("the carousel is keyboard operable and labelled", async ({
    page,
    user,
  }, info) => {
    test.skip(info.project.name !== "desktop");
    await user.signIn(page);
    await page.goto("/gallery");
    const tile = page.getByRole("button", { name: /^Photo, Sep 20, 2026/ });
    await tile.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Lightbox" });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove highlight" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include(".yarl__root")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id),
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("skip link jumps to the main content", async ({ page, user }, info) => {
    test.skip(info.project.name !== "desktop");
    await user.signIn(page);
    await page.goto("/plan");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});
