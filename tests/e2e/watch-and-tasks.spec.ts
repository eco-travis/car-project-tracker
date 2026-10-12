import { adminClient } from "../support/local-supabase";
import { baseJpeg } from "../support/jpeg";
import { todayIso } from "@/lib/domain/dates";
import { addInterval } from "@/lib/domain/watch";
import { test, expect, seedJob, seedRow } from "./fixtures";

const today = todayIso();

test.describe("spec flow 7: add a watch item", () => {
  test("from the Watch list: follow-up in 3 months and 3,000 miles, with a first check-in and clip", async ({
    page,
    user,
  }) => {
    await user.createVehicle("Flow 7", 141250);
    await user.signIn(page);
    await page.goto("/watch");
    await page.getByRole("button", { name: "Add watch item" }).click();
    const dialog = page.getByRole("dialog", { name: "Add watch item" });
    await dialog
      .getByLabel("What did you notice?")
      .fill("Power steering pump moaning on cold start");
    await dialog.getByLabel("System").selectOption("steering");
    await dialog.getByLabel("Severity").selectOption("concerning");
    await dialog.getByLabel("Follow up in", { exact: true }).fill("3");
    await dialog.getByLabel("Interval unit").selectOption("months");
    await dialog.getByLabel("Follow up in miles").fill("3,000");
    await dialog
      .getByLabel("Today's observation")
      .fill("Moan for ~10 seconds below 40°F");
    const chooser = page.waitForEvent("filechooser");
    await dialog.getByRole("button", { name: "Attach clip or photo" }).click();
    await (
      await chooser
    ).setFiles({
      name: "moan.jpg",
      mimeType: "image/jpeg",
      buffer: baseJpeg(),
    });
    await dialog.getByRole("button", { name: "Add watch item" }).click();

    await expect(page).toHaveURL(/\/watch\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Power steering pump moaning on cold start",
    );
    const followup = page.getByRole("region", {
      name: "Follow-up and actions",
    });
    await expect(followup).toContainText("144,250 mi");

    const admin = adminClient();
    const { data: item } = await admin
      .from("watch_items")
      .select("*, checkins:watch_checkins(id, odometer, observation)")
      .eq("owner_id", user.id)
      .single();
    expect(item).toMatchObject({
      system: "steering",
      severity: "concerning",
      status: "watching",
      next_followup_on: addInterval(today, 3, "months"),
      next_followup_odometer: 144250,
    });
    expect(item!.checkins).toHaveLength(1);
    expect(item!.checkins[0]).toMatchObject({
      odometer: 141250,
      observation: "Moan for ~10 seconds below 40°F",
    });
    const { count } = await admin
      .from("attachments")
      .select("*", { count: "exact", head: true })
      .eq("watch_checkin_id", item!.checkins[0].id);
    expect(count).toBe(1);
  });

  test("from quick-add on the phone", async ({ page, user }, info) => {
    test.skip(info.project.name !== "phone");
    await user.createVehicle("Flow 7 phone", 1000);
    await user.signIn(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Quick add" }).click();
    await page.getByRole("menuitem", { name: "Watch item" }).click();
    const dialog = page.getByRole("dialog", { name: "Add watch item" });
    await dialog
      .getByLabel("What did you notice?")
      .fill("Rear diff whine at 60");
    await dialog.getByLabel("Follow up in miles").fill("500");
    await dialog.getByRole("button", { name: "Add watch item" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toContainText("the Watch list");
    const { data } = await adminClient()
      .from("watch_items")
      .select("next_followup_odometer")
      .eq("owner_id", user.id)
      .single();
    expect(data!.next_followup_odometer).toBe(1500);
  });
});

test.describe("spec flow 8: check in on a watch item", () => {
  test("a due item comes first; check in, then promote to a Repair job with suspected parts carried over", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 8", 141250);
    const admin = adminClient();
    // Bulk inserts send the union of keys, so every row sets every column it varies on.
    await admin.from("watch_items").insert([
      {
        owner_id: user.id,
        vehicle_id: vehicle.id,
        title: "Not due yet",
        severity: "monitor",
        next_followup_on: addInterval(today, 30, "days"),
        next_followup_odometer: null,
      },
      {
        owner_id: user.id,
        vehicle_id: vehicle.id,
        title: "Clunk over bumps",
        severity: "act_soon",
        next_followup_on: null,
        next_followup_odometer: 141000,
      },
    ]);
    const { data: item } = await admin
      .from("watch_items")
      .select("id")
      .eq("title", "Clunk over bumps")
      .single();
    const partId = await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      name: "Front sway bar link",
      status: "idea",
    });
    await admin
      .from("watch_item_parts")
      .insert({ owner_id: user.id, watch_item_id: item!.id, part_id: partId });
    await user.signIn(page);

    await page.goto("/watch");
    const rows = page
      .getByRole("list", { name: "Watching" })
      .getByRole("listitem");
    await expect(rows.first()).toContainText("Clunk over bumps");
    await expect(rows.first()).toContainText("Due");

    await rows
      .first()
      .getByRole("button", { name: "Check in on Clunk over bumps" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Check in" });
    await expect(dialog.getByLabel("Odometer (miles)")).toHaveValue("141250");
    await dialog.getByLabel("Odometer (miles)").fill("141400");
    await dialog
      .getByLabel("What did you observe?")
      .fill("Louder over speed bumps, front left");
    await dialog.getByRole("button", { name: "Save check-in" }).click();

    const next = page.getByRole("dialog", { name: "Check-in saved" });
    await next.getByRole("button", { name: "Promote to job" }).click();
    const promote = page.getByRole("dialog", { name: "Promote to job" });
    await expect(promote.getByLabel("Job type")).toHaveValue("diagnosis");
    await promote.getByLabel("Job type").selectOption("repair");
    await promote
      .getByLabel("Phase")
      .selectOption({ label: "Suspension and tires" });
    await promote.getByRole("button", { name: "Promote to job" }).click();

    await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Clunk over bumps",
    );
    await expect(page.getByText("Repair · From watch item")).toBeVisible();
    await expect(page.getByRole("region", { name: "Parts" })).toContainText(
      "Front sway bar link",
    );

    const jobId = page.url().split("/").pop()!;
    const { data: w } = await admin
      .from("watch_items")
      .select("status, promoted_job_id")
      .eq("id", item!.id)
      .single();
    expect(w).toEqual({ status: "promoted", promoted_job_id: jobId });
    const { data: v } = await admin
      .from("vehicles")
      .select("current_odometer")
      .eq("id", vehicle.id)
      .single();
    expect(v!.current_odometer).toBe(141400); // rule 14 via check-in
  });

  test("check in, then set the next follow-up; or resolve (check-ins kept)", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 8 options", 1000);
    const admin = adminClient();
    const { data: a } = await admin
      .from("watch_items")
      .insert({
        owner_id: user.id,
        vehicle_id: vehicle.id,
        title: "Seep at oil pan",
        next_followup_on: today,
      })
      .select("id")
      .single();
    const { data: b } = await admin
      .from("watch_items")
      .insert({
        owner_id: user.id,
        vehicle_id: vehicle.id,
        title: "Squeaky door",
      })
      .select("id")
      .single();
    await user.signIn(page);

    await page.goto(`/watch/${a!.id}`);
    await page.getByRole("button", { name: "Check in" }).click();
    await page
      .getByRole("dialog", { name: "Check in" })
      .getByLabel("What did you observe?")
      .fill("Same small seep");
    await page
      .getByRole("dialog", { name: "Check in" })
      .getByRole("button", { name: "Save check-in" })
      .click();
    await page
      .getByRole("dialog", { name: "Check-in saved" })
      .getByRole("button", { name: "Set next follow-up" })
      .click();
    const followup = page.getByRole("dialog", { name: "Set next follow-up" });
    await followup.getByLabel("Follow up in", { exact: true }).fill("2");
    await followup.getByLabel("Interval unit").selectOption("weeks");
    await followup.getByRole("button", { name: "Save follow-up" }).click();
    await expect(followup).toBeHidden();
    const { data: after } = await admin
      .from("watch_items")
      .select("next_followup_on, status")
      .eq("id", a!.id)
      .single();
    expect(after).toEqual({
      next_followup_on: addInterval(today, 2, "weeks"),
      status: "watching",
    });
    await expect(
      page.getByRole("list", { name: "Check-in history" }),
    ).toContainText("Same small seep");

    await page.goto(`/watch/${b!.id}`);
    await page.getByRole("button", { name: "Check in" }).click();
    await page
      .getByRole("dialog", { name: "Check in" })
      .getByRole("button", { name: "Save check-in" })
      .click();
    await page
      .getByRole("dialog", { name: "Check-in saved" })
      .getByRole("button", { name: "Resolve" })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const { data: resolved } = await admin
      .from("watch_items")
      .select("status, closed_on, checkins:watch_checkins(id)")
      .eq("id", b!.id)
      .single();
    expect(resolved).toMatchObject({ status: "resolved", closed_on: today });
    expect(resolved!.checkins).toHaveLength(1);
    await page.goto("/watch");
    await expect(page.getByRole("region", { name: "Closed" })).toContainText(
      "Squeaky door",
    );
  });
});

test.describe("spec flow 9: add a task", () => {
  test("from a job with 'blocks this job': the job can't reach Ready until the task is done", async ({
    page,
    user,
  }) => {
    const vehicle = await user.createVehicle("Flow 9");
    const jobId = await seedJob(user, vehicle, { title: "Install lift" });
    await user.signIn(page);
    await page.goto(`/jobs/${jobId}`);

    const tasks = page.getByRole("region", { name: "Tasks" });
    await tasks.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await dialog
      .getByLabel("Task", { exact: true })
      .fill("Book bay at DIY garage");
    await dialog
      .getByLabel("Due date (optional)")
      .fill(addInterval(today, 3, "days"));
    await dialog.getByLabel("Blocks this job").check();
    await dialog.getByRole("button", { name: "Add task" }).click();
    await expect(dialog).toBeHidden();
    await expect(tasks).toContainText("Book bay at DIY garage");
    await expect(tasks).toContainText("Blocks a job");

    await page.getByLabel("Status", { exact: true }).selectOption("ready");
    await expect(
      page.getByRole("alert").filter({ hasText: "Blocked by" }),
    ).toHaveText(
      'Blocked by task "Book bay at DIY garage". Finish or remove it first.',
    );
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "not_started",
    );

    // Rule 20: completing the task changes nothing else...
    await tasks
      .getByRole("checkbox", { name: "Complete Book bay at DIY garage" })
      .check();
    await expect(
      tasks.getByRole("checkbox", { name: "Reopen Book bay at DIY garage" }),
    ).toBeChecked();
    const { data: job } = await adminClient()
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single();
    expect(job!.status).toBe("not_started");

    // ...but it clears the blocker (rule 1) once the page has refreshed.
    await expect(
      page
        .getByRole("region", { name: "Dependencies" })
        .getByText("Task: Book bay at DIY garage")
        .locator(".."),
    ).toContainText("Done");
    await page.getByLabel("Status", { exact: true }).selectOption("ready");
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "ready",
    );
  });

  test("from quick-add and the Tasks screen, ordered by due date with undated last", async ({
    page,
    user,
  }, info) => {
    const vehicle = await user.createVehicle("Tasks screen");
    const partId = await seedRow(user, "parts", {
      vehicle_id: vehicle.id,
      name: "Stock wheels",
      status: "removed",
    });
    await seedRow(user, "tasks", {
      vehicle_id: vehicle.id,
      title: "Undated errand",
    });
    await seedRow(user, "tasks", {
      vehicle_id: vehicle.id,
      title: "Soon errand",
      due_on: addInterval(today, 1, "days"),
    });
    await user.signIn(page);
    await page.goto("/tasks");

    if (info.project.name === "phone") {
      await page.getByRole("button", { name: "Quick add" }).click();
      await page.getByRole("menuitem", { name: "Task" }).click();
    } else {
      await page.getByRole("button", { name: "Add task" }).click();
    }
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await dialog
      .getByLabel("Task", { exact: true })
      .fill("List stock wheels for sale");
    await dialog
      .getByLabel("Due date (optional)")
      .fill(addInterval(today, 5, "days"));
    await dialog.getByLabel("Link type").selectOption("part");
    await dialog
      .getByLabel("Record to link")
      .selectOption({ label: "Stock wheels" });
    await dialog.getByRole("button", { name: "Link", exact: true }).click();
    await expect(dialog).toContainText("Part: Stock wheels");
    await dialog.getByRole("button", { name: "Add task" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/tasks");
    const open = page
      .getByRole("list", { name: "Open tasks" })
      .getByRole("listitem");
    await expect(open.nth(0)).toContainText("Soon errand");
    await expect(open.nth(1)).toContainText("List stock wheels for sale");
    await expect(
      open.nth(1).getByRole("link", { name: "Part: Stock wheels" }),
    ).toHaveAttribute("href", `/parts/${partId}`);
    await expect(open.nth(2)).toContainText("Undated errand");
  });
});
