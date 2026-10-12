import { adminClient } from "../support/local-supabase";
import { baseJpeg, withExifDate } from "../support/jpeg";
import { test, expect, seedJob, seedPhoto, seedRow } from "./fixtures";

const exifPhoto = (date: string, name = "IMG_0001.jpg") => ({
  name,
  mimeType: "image/jpeg",
  buffer: withExifDate(baseJpeg(), date),
});

test.describe("spec flow 1: quick add from phone", () => {
  test("uploads a photo in two taps after choosing the file; it lands on the job and in the Gallery under its taken month", async ({
    page,
    user,
  }, info) => {
    test.skip(info.project.name !== "phone", "Phone acceptance criterion");
    const vehicle = await user.createVehicle("Quick add");
    await seedJob(user, vehicle, { title: "Older job" });
    const jobId = await seedJob(user, vehicle, { title: "Coolant pipes" }); // most recent
    await user.signIn(page);
    await page.goto("/plan");

    await page.getByRole("button", { name: "Quick add" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Photo" }).click();
    await (await chooser).setFiles(exifPhoto("2026:03:14 10:30:00"));

    const sheet = page.getByRole("dialog", { name: "Quick add" });
    await expect(
      sheet.getByRole("radio", { name: /Coolant pipes/ }),
    ).toBeChecked(); // recent first, preselected
    let taps = 0;
    await sheet.getByRole("radio", { name: /Coolant pipes/ }).click(); // tap 1 (already selected; still counts)
    taps++;
    await sheet.getByRole("button", { name: "Save" }).click(); // tap 2
    taps++;
    expect(taps).toBeLessThanOrEqual(2);
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toContainText("Coolant pipes");

    await page.goto(`/jobs/${jobId}`);
    const photos = page.getByRole("region", { name: "Photos and files" });
    await expect(
      photos.getByRole("button", { name: /^Photo, Mar 14, 2026, 10:30 AM/ }),
    ).toBeVisible();

    await page.goto("/gallery");
    const march = page.getByRole("region", { name: "March 2026" });
    await expect(
      march.getByRole("button", { name: /^Photo, Mar 14, 2026/ }),
    ).toHaveCount(1);

    // Stored compressed with a thumbnail, at the owner-prefixed path.
    const { data } = await adminClient()
      .from("attachments")
      .select("storage_path, thumb_path, mime_type, taken_at")
      .eq("job_id", jobId)
      .single();
    expect(data!.storage_path).toMatch(
      new RegExp(`^${user.id}/[0-9a-f-]{36}/IMG_0001\\.jpg$`),
    );
    expect(data!.thumb_path).toMatch(/\/thumb\.jpg$/);
    expect(new Date(data!.taken_at).toISOString()).toBe(
      "2026-03-14T17:30:00.000Z",
    ); // Pacific wall time
  });

  test("desktop quick add works from the sidebar", async ({
    page,
    user,
  }, info) => {
    test.skip(info.project.name !== "desktop");
    const vehicle = await user.createVehicle("Quick add desktop");
    await seedJob(user, vehicle, { title: "Oil change" });
    await user.signIn(page);
    await page.goto("/dashboard");
    await page
      .locator("aside")
      .getByRole("button", { name: "Quick add" })
      .click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Photo" }).click();
    await (await chooser).setFiles(exifPhoto("2026:05:02 08:00:00"));
    await page
      .getByRole("dialog", { name: "Quick add" })
      .getByLabel("Note (optional)")
      .fill("Drain plug torque 30 Nm");
    await page
      .getByRole("dialog", { name: "Quick add" })
      .getByRole("button", { name: "Save" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toContainText("Oil change");
    const { data } = await adminClient()
      .from("attachments")
      .select("caption")
      .eq("owner_id", user.id)
      .single();
    expect(data!.caption).toBe("Drain plug torque 30 Nm");
  });
});

test("Gallery excludes inspiration media and shows receipts only with the toggle", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Gallery filters");
  const jobId = await seedJob(user, vehicle, { title: "Brakes" });
  const inspirationId = await seedRow(user, "expenses", {
    vehicle_id: vehicle.id,
    spent_on: "2026-04-01",
    amount_cents: 100,
    category: "part",
  });
  const { data: insp } = await adminClient()
    .from("inspirations")
    .insert({ owner_id: user.id, vehicle_id: vehicle.id, title: "Rack idea" })
    .select("id")
    .single();
  await seedPhoto(user, vehicle, {
    job_id: jobId,
    taken_at: "2026-04-01T18:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    inspiration_id: insp!.id,
    taken_at: "2026-04-02T18:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    expense_id: inspirationId,
    kind: "receipt",
    taken_at: "2026-04-03T18:00:00Z",
  });
  await user.signIn(page);

  await page.goto("/gallery");
  const tiles = page
    .getByRole("region", { name: "April 2026" })
    .getByRole("button");
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first()).toHaveAccessibleName(/^Photo/);

  await page.getByLabel("Include receipts and documents").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(1)).toHaveAccessibleName(/^Receipt/);
  // Inspiration media never appears, even with every filter open.
  await expect(page.getByRole("button", { name: /Apr 2, 2026/ })).toHaveCount(
    0,
  );
});

test("spec flow 10: review progress with highlights only, captions, and starring from the carousel", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Flow 10");
  const suspension = vehicle.phases[1];
  const jobId = await seedJob(user, vehicle, {
    title: "Lift spacers",
    phase_id: suspension.id,
    status: "done",
    completed_on: "2026-06-01",
    completed_odometer: 141800,
  });
  const first = await seedPhoto(user, vehicle, {
    job_id: jobId,
    highlight: true,
    tag: "before",
    taken_at: "2026-05-30T16:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    job_id: jobId,
    highlight: false,
    taken_at: "2026-05-31T16:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    job_id: jobId,
    highlight: true,
    tag: "after",
    taken_at: "2026-06-01T16:00:00Z",
  });
  await user.signIn(page);

  await page.goto("/gallery");
  await page.getByLabel("Highlights only").check();
  await page.getByRole("button", { name: "Apply" }).click();
  const tiles = page
    .getByRole("region", { name: /May 2026|June 2026/ })
    .getByRole("button");
  await expect(
    page.getByRole("button", { name: /^Photo, .*highlighted$/ }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: /^Photo, May 31/ }),
  ).toHaveCount(0);

  // Oldest first: the before photo opens first.
  await page.getByRole("button", { name: /^Photo, May 30, 2026/ }).click();
  const current = page.locator(".yarl__slide_current");
  await expect(current).toContainText("May 30, 2026");
  await expect(current).toContainText("141,800 mi");
  await expect(current).toContainText("Suspension and tires · Lift spacers");
  await expect(
    current.getByRole("link", { name: "Open Lift spacers" }),
  ).toHaveAttribute("href", `/jobs/${jobId}`);

  // Swipe to the next (newer) highlight.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".yarl__slide_current")).toContainText(
    "Jun 1, 2026",
  );

  // Star toggling works from the carousel.
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.locator(".yarl__slide_current")).toContainText(
    "May 30, 2026",
  );
  const star = page.getByRole("button", { name: "Remove highlight" });
  await star.click();
  await expect(
    page.getByRole("button", { name: "Highlight", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(
      async () =>
        (
          await adminClient()
            .from("attachments")
            .select("highlight")
            .eq("id", first)
            .single()
        ).data!.highlight,
    )
    .toBe(false);
  void tiles;
});

test("spec flow 11: View photos on a job, phase, and part opens the scoped carousel", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Flow 11");
  const armor = vehicle.phases[2];
  const jobId = await seedJob(user, vehicle, {
    title: "Skid plates",
    phase_id: armor.id,
  });
  const otherJob = await seedJob(user, vehicle, { title: "Unrelated" });
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    job_id: jobId,
    name: "Front skid",
  });
  await seedPhoto(user, vehicle, {
    job_id: jobId,
    caption: "Job shot",
    taken_at: "2026-07-01T16:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    phase_id: armor.id,
    caption: "Phase shot",
    taken_at: "2026-07-02T16:00:00Z",
  });
  await seedPhoto(user, vehicle, {
    job_id: otherJob,
    caption: "Other shot",
    taken_at: "2026-07-03T16:00:00Z",
  });
  await user.signIn(page);

  // Job: only its own media.
  await page.goto(`/jobs/${jobId}`);
  await page.getByRole("button", { name: "View photos" }).click();
  await expect(page.locator(".yarl__slide_current")).toContainText("Job shot");
  await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0); // only one slide
  await page.getByRole("button", { name: "Close" }).click();

  // Phase: its own media plus its jobs' media.
  await page.goto("/plan");
  await page
    .getByRole("region", { name: /Armor and recovery/ })
    .getByRole("button", { name: "Photos" })
    .click();
  await expect(page.locator(".yarl__slide_current")).toContainText("Job shot");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".yarl__slide_current")).toContainText(
    "Phase shot",
  );
  // Last slide: the other job's photo isn't in this phase's carousel.
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.getByRole("button", { name: "Close" }).click();

  // Part with no media says so.
  await page.goto(`/parts/${partId}`);
  await page.getByRole("button", { name: "View photos" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "No photos or clips yet." }),
  ).toBeVisible();
});

test("attachments panel: upload, tag, and delete (removing the stored file)", async ({
  page,
  user,
}, info) => {
  test.skip(info.project.name !== "desktop");
  const vehicle = await user.createVehicle("Panel");
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Coolant pipe kit",
  });
  await user.signIn(page);
  await page.goto(`/parts/${partId}`);
  const panel = page.getByRole("region", { name: "Photos and files" });
  const chooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "Add photos" }).click();
  await (await chooser).setFiles(exifPhoto("2026:08:09 12:00:00", "pipes.jpg"));
  const tile = panel.getByRole("button", { name: /^Photo, Aug 9, 2026/ });
  await expect(tile).toBeVisible();

  await panel.getByRole("button", { name: /^Edit Photo, Aug 9/ }).click();
  const dialog = page.getByRole("dialog", { name: "Edit attachment" });
  await dialog.getByLabel("Tag").selectOption("before");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    panel.getByRole("button", { name: /^Photo, Aug 9, 2026.*, before$/ }),
  ).toBeVisible();

  const { data: row } = await adminClient()
    .from("attachments")
    .select("storage_path")
    .eq("part_id", partId)
    .single();
  await panel.getByRole("button", { name: /^Edit Photo, Aug 9/ }).click();
  await page
    .getByRole("dialog", { name: "Edit attachment" })
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete file" })
    .click();
  await expect(panel.getByText("No photos or files yet.")).toBeVisible();
  const folder = row!.storage_path.split("/").slice(0, 2).join("/");
  const { data: objects } = await adminClient()
    .storage.from("attachments")
    .list(folder);
  expect(objects).toEqual([]);
});
