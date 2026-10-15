import { adminClient } from "../support/local-supabase";
import { baseJpeg } from "../support/jpeg";
import { test, expect, seedJob, seedRow } from "./fixtures";

const tinyPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
const REMOVED = [
  "Brand",
  "Fitment notes",
  "Superseded numbers",
  "Aftermarket part number",
  "Job",
  "Replaces",
  "Product link",
  "Order number",
  "Return by",
  "Warranty notes",
];

test("Add part is simplified and can attach a receipt or invoice", async ({
  page,
  user,
}) => {
  await user.createVehicle("Part form");
  await user.signIn(page);
  await page.goto("/parts");
  await page.getByRole("button", { name: "Add part" }).click();
  const dialog = page.getByRole("dialog", { name: "Add part" });
  for (const label of REMOVED)
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCount(0);
  for (const label of [
    "Name",
    "Category",
    "Status",
    "Quantity",
    "OEM part number",
    "Web link",
    "Notes",
  ]) {
    await expect(dialog.getByLabel(label, { exact: true })).toBeVisible();
  }

  await dialog.getByLabel("Name", { exact: true }).fill("Front control arms");
  await dialog
    .getByLabel("Category", { exact: true })
    .selectOption("suspension");
  await dialog.getByLabel("Status", { exact: true }).selectOption("ordered");
  await dialog
    .getByLabel("Web link", { exact: true })
    .fill("https://www.fcpeuro.com/meyle-hd");
  const chooser = page.waitForEvent("filechooser");
  await dialog
    .getByRole("button", { name: "Attach receipt or invoice" })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "fcp-invoice.pdf",
    mimeType: "application/pdf",
    buffer: tinyPdf,
  });
  await expect(dialog).toContainText("fcp-invoice.pdf");
  await dialog.getByRole("button", { name: "Add part" }).click();

  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Front control arms",
  );
  const files = page.getByRole("region", { name: "Photos and files" });
  await expect(files.getByRole("button", { name: /^Receipt,/ })).toBeVisible();

  const partId = page.url().split("/").pop()!;
  const { data } = await adminClient()
    .from("attachments")
    .select("kind, mime_type")
    .eq("part_id", partId)
    .single();
  expect(data).toEqual({ kind: "receipt", mime_type: "application/pdf" });

  // Receipts stay out of the Gallery by default.
  await page.goto("/gallery");
  await expect(page.getByText("No photos yet.")).toBeVisible();
});

test("editing keeps the other fields under More details", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Part edit");
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Lift spacers",
  });
  await user.signIn(page);
  await page.goto(`/parts/${partId}`);
  // Optional fields that are empty aren't listed in Details.
  await expect(page.getByRole("region", { name: "Details" })).not.toContainText(
    "Order number",
  );

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit part" });
  await expect(dialog.getByLabel("Order number", { exact: true })).toBeHidden(); // collapsed
  await dialog.getByText("More details").click();
  await dialog.getByLabel("Order number", { exact: true }).fill("FCP-88812");
  await dialog.getByLabel("Web link", { exact: true }).fill("not a url");
  await dialog.getByRole("button", { name: "Save part" }).click();
  await expect(
    dialog.getByText("Enter a full link starting with https://"),
  ).toBeVisible();
  await dialog
    .getByLabel("Web link", { exact: true })
    .fill("https://www.fcpeuro.com/");
  await dialog.getByRole("button", { name: "Save part" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: "Details" })).toContainText(
    "FCP-88812",
  );
});

test("adding a part from a job still links it to that job", async ({
  page,
  user,
}) => {
  const vehicle = await user.createVehicle("Part from job");
  const jobId = await seedJob(user, vehicle, {
    title: "Control arm swap",
    type: "repair",
  });
  await user.signIn(page);
  await page.goto(`/jobs/${jobId}`);
  await page
    .getByRole("region", { name: "Parts" })
    .getByRole("button", { name: "New part" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add part" });
  await dialog.getByLabel("Name", { exact: true }).fill("Lower control arm");
  await dialog.getByRole("button", { name: "Add part" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("list", { name: "Parts on this job" }),
  ).toContainText("Lower control arm");
  const { data } = await adminClient()
    .from("parts")
    .select("job_id")
    .eq("owner_id", user.id)
    .single();
  expect(data!.job_id).toBe(jobId);
});

test("part page uploads a receipt or invoice", async ({ page, user }) => {
  const vehicle = await user.createVehicle("Receipt on part");
  const partId = await seedRow(user, "parts", {
    vehicle_id: vehicle.id,
    name: "Brake pads",
  });
  await user.signIn(page);
  await page.goto(`/parts/${partId}`);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add receipt or invoice" }).click();
  await (
    await chooser
  ).setFiles({
    name: "receipt.jpg",
    mimeType: "image/jpeg",
    buffer: baseJpeg(),
  });
  await expect(
    page
      .getByRole("region", { name: "Photos and files" })
      .getByRole("button", { name: /^Receipt,/ }),
  ).toBeVisible();
});

test("Add part with a cost records a paid expense linked to the part", async ({
  page,
  user,
}) => {
  await user.createVehicle("Part cost");
  await user.signIn(page);
  await page.goto("/parts");
  await page.getByRole("button", { name: "Add part" }).click();
  const dialog = page.getByRole("dialog", { name: "Add part" });
  await dialog.getByLabel("Name", { exact: true }).fill("Skid plate");
  await dialog.getByLabel("Cost (optional)").fill("abc");
  await dialog.getByRole("button", { name: "Add part" }).click();
  await expect(
    dialog.getByText("Cost must be a dollar amount like 1,234.56."),
  ).toBeVisible();
  await dialog.getByLabel("Cost (optional)").fill("1,249.99");
  await dialog.getByLabel("Vendor", { exact: true }).fill("Rennline");
  await dialog.getByRole("button", { name: "Add part" }).click();

  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  const partId = page.url().split("/").pop()!;
  await expect(page.getByRole("region", { name: "Expenses" })).toContainText(
    "$1,249.99",
  );
  const admin = adminClient();
  const { data: expense } = await admin
    .from("expenses")
    .select("amount_cents, category, state, vendor")
    .eq("part_id", partId)
    .single();
  expect(expense).toEqual({
    amount_cents: 124999,
    category: "part",
    state: "paid",
    vendor: "Rennline",
  });
  const { data: part } = await admin
    .from("parts")
    .select("status")
    .eq("id", partId)
    .single();
  expect(part!.status).toBe("ordered"); // rule: an expense on a planning-stage part marks it Ordered
});

test("Add part without a cost creates no expense", async ({ page, user }) => {
  await user.createVehicle("Part no cost");
  await user.signIn(page);
  await page.goto("/parts");
  await page.getByRole("button", { name: "Add part" }).click();
  const dialog = page.getByRole("dialog", { name: "Add part" });
  await dialog.getByLabel("Name", { exact: true }).fill("Recovery boards");
  await dialog.getByRole("button", { name: "Add part" }).click();
  await expect(page).toHaveURL(/\/parts\/[0-9a-f-]{36}$/);
  const { count } = await adminClient()
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);
  expect(count).toBe(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Edit part" })
      .getByLabel("Cost (optional)"),
  ).toHaveCount(0);
});
