import { adminClient } from "../support/local-supabase";
import { seedDemo } from "../support/demo-data";
import { test, expect, seedPhoto } from "./fixtures";

test.describe("dashboard (M7) with the seed data", () => {
  test.beforeEach(async ({ user }) => {
    await seedDemo(adminClient(), user.id);
  });

  test("each card shows the expected values and links to its screen", async ({
    page,
    user,
  }) => {
    const { data: vehicle } = await adminClient()
      .from("vehicles")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    const { data: job } = await adminClient()
      .from("jobs")
      .select("id")
      .eq("owner_id", user.id)
      .eq("title", "Coolant pipes")
      .single();
    await seedPhoto(
      user,
      { id: vehicle!.id, phases: [] },
      { job_id: job!.id, highlight: true, taken_at: "2026-09-20T17:00:00Z" },
    );
    await user.signIn(page);
    await page.goto("/dashboard");

    const card = (name: string) =>
      page.getByRole("region", { name: new RegExp(`^${name}`) });

    // Money: purchase $12,500 + $1,069 paid. Ownership = oil 89 + ATF 42 + coolant pipes 389 + brakes 460.
    const money = card("Money");
    await expect(money).toContainText("Total invested$13,569.00");
    await expect(money).toContainText("Build cost$25.00");
    await expect(money).toContainText("Ownership cost$980.00");
    await expect(money).toContainText("Tools$64.00");
    await expect(money).toContainText("Recovered$0.00");
    await expect(money).toContainText("Committed, not yet paid$1,737.00");

    // Active phase: Baseline maintenance, $3,000 budget, $545 paid, $112 committed.
    const phase = card("Active phase");
    await expect(phase).toContainText("Baseline maintenance");
    await expect(phase).toContainText("Paid$545.00");
    await expect(phase).toContainText("Committed$112.00");
    await expect(phase).toContainText("Remaining$2,343.00");
    await expect(
      phase.getByRole("img", {
        name: "Baseline maintenance budget: 22% of budget used",
      }),
    ).toBeVisible();

    const jobs = page
      .getByRole("list", { name: "Jobs ready or waiting on parts" })
      .getByRole("listitem");
    await expect(jobs).toHaveCount(2);
    await expect(jobs.nth(0)).toContainText("All-terrain tires");
    await expect(jobs.nth(0)).toContainText("Ready");
    await expect(jobs.nth(1)).toContainText("Spark plugs and coils");
    await expect(jobs.nth(1)).toContainText("Waiting on parts");

    const parts = page
      .getByRole("list", { name: "Parts on order" })
      .getByRole("link");
    await expect(parts).toHaveText([
      "BFGoodrich KO2 275/55R19",
      "Bosch Spark plugs",
    ]);

    const watch = page
      .getByRole("list", { name: "Watch items due or overdue" })
      .getByRole("listitem");
    await expect(watch).toHaveCount(2);
    await expect(watch.nth(0)).toContainText(
      "Power steering pump moan on cold start",
    );
    await expect(watch.nth(0)).toContainText("Overdue");
    await expect(watch.nth(1)).toContainText(
      "Clunk over speed bumps (front left)",
    );
    await expect(watch.nth(1)).toContainText("Due");

    const tasks = page
      .getByRole("list", { name: "Tasks due within 7 days" })
      .getByRole("listitem");
    await expect(tasks).toHaveCount(1);
    await expect(tasks.first()).toContainText(
      "Book bay at DIY garage for lift install",
    );

    await expect(card("Odometer")).toContainText("141,250 mi");
    await expect(
      card("Latest highlight").getByRole("button", {
        name: /Open latest highlight, Sep 20, 2026/,
      }),
    ).toBeVisible();
    await expect(card("Latest highlight")).toContainText("Coolant pipes");

    // Every card heading links to its screen.
    const links: [string, string][] = [
      ["Money", "/vehicle"],
      ["Active phase", "/plan"],
      ["Jobs ready or waiting", "/plan"],
      ["Parts arriving", "/parts?status=ordered"],
      ["Watch items due", "/watch"],
      ["Tasks due this week", "/tasks"],
      ["Odometer", "/vehicle"],
      ["Latest highlight", "/gallery?highlights=1"],
    ];
    for (const [name, href] of links) {
      await expect(
        card(name).getByRole("heading", { level: 2 }).getByRole("link"),
      ).toHaveAttribute("href", href);
    }
  });

  test("quick odometer update raises the reading and refreshes due watch items", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    await page.goto("/dashboard");
    const odometer = page.getByRole("region", { name: /^Odometer/ });
    await odometer.getByLabel("Current odometer (miles)").fill("144100");
    await odometer.getByRole("button", { name: "Update odometer" }).click();
    await expect(odometer.getByRole("status")).toHaveText(
      "Odometer set to 144,100 mi.",
    );
    // The oil-pan seep was due at 144,000 mi; it's now due too.
    await expect(
      page
        .getByRole("list", { name: "Watch items due or overdue" })
        .getByRole("listitem"),
    ).toHaveCount(3);
    const { data } = await adminClient()
      .from("vehicles")
      .select("current_odometer")
      .eq("owner_id", user.id)
      .single();
    expect(data!.current_odometer).toBe(144100);
  });

  test("parts card link opens Parts filtered to Ordered", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    await page.goto("/dashboard");
    await page
      .getByRole("region", { name: /^Parts arriving/ })
      .getByRole("heading")
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(/\/parts\?status=ordered$/);
    await expect(
      page.getByRole("table", { name: "Parts" }).getByRole("row"),
    ).toHaveCount(3); // header + 2
  });
});
