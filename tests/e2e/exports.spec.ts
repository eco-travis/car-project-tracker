import ExcelJS from "exceljs";
import { extractText, getDocumentProxy } from "unpdf";
import { adminClient } from "../support/local-supabase";
import { seedDemo } from "../support/demo-data";
import { EXPORT_TABLES } from "@/lib/domain/exports";
import { test, expect, seedPhoto } from "./fixtures";

async function pdfText(body: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(body));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text, totalPages };
}

test.describe("exports (M8) with the seed data", () => {
  test.beforeEach(async ({ user }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Same files on every viewport; the download UI is covered below",
    );
    const { vehicle_id } = await seedDemo(adminClient(), user.id);
    const admin = adminClient();
    const { data: recovery } = await admin
      .from("jobs")
      .select("id")
      .eq("owner_id", user.id)
      .eq("title", "Rear recovery points")
      .single();
    await seedPhoto(
      user,
      { id: vehicle_id, phases: [] },
      {
        job_id: recovery!.id,
        highlight: true,
        taken_at: "2026-09-15T20:00:00Z",
      },
    );
    const { data: brakes } = await admin
      .from("expenses")
      .select("id")
      .eq("owner_id", user.id)
      .eq("vendor", "Eastside Euro")
      .single();
    await seedPhoto(
      user,
      { id: vehicle_id, phases: [] },
      {
        expense_id: brakes!.id,
        kind: "receipt",
        taken_at: "2026-09-28T20:00:00Z",
      },
    );
  });

  test("service history PDF parses, lists done ownership jobs newest first, and hides all dollars with costs=0", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    const res = await page.request.get(
      "/api/exports/service-history?receipts=1",
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toMatch(
      /attachment; filename="service-history-\d{4}-\d{2}-\d{2}\.pdf"/,
    );
    const body = await res.body();
    const { text, totalPages } = await pdfText(body);
    expect(totalPages).toBeGreaterThanOrEqual(1);
    const order = [
      "Front brake pads",
      "Transfer case fluid",
      "Engine oil and filter",
    ].map((t) => text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order); // newest first
    expect(text).toContain("141,100 mi");
    expect(text).toContain("OEM 000 043 300 56");
    expect(text).toContain("Shop: Eastside Euro");
    expect(text).toContain("$460.00");
    expect(text).not.toContain("Rear recovery points"); // modifications aren't service history
    expect(body.toString("latin1")).toContain("/Subtype /Image"); // receipt thumbnail embedded

    const hidden = await pdfText(
      await (
        await page.request.get("/api/exports/service-history?costs=0")
      ).body(),
    );
    expect(hidden.text).toContain("Front brake pads");
    expect(hidden.text).not.toContain("$");
  });

  test("build sheet PDF groups modifications by phase with installed parts and a photo; costs=0 hides dollars", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    const res = await page.request.get("/api/exports/build-sheet");
    expect(res.status()).toBe(200);
    const body = await res.body();
    const { text } = await pdfText(body);
    expect(text).toContain("Armor and recovery");
    expect(text).toContain("Rear recovery points");
    expect(text).toContain("Rennen Rear recovery points");
    expect(text).toContain("RN-955-RRP");
    expect(text).toContain("$320.00");
    expect(text).not.toContain("Front brake pads");
    expect(body.toString("latin1")).toContain("/Subtype /Image"); // job photo embedded

    const hidden = await pdfText(
      await (await page.request.get("/api/exports/build-sheet?costs=0")).body(),
    );
    expect(hidden.text).toContain("Rear recovery points");
    expect(hidden.text).not.toContain("$");
  });

  test("full data .xlsx reopens with one sheet per table, ids, and money in dollars", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    const res = await page.request.get("/api/exports/xlsx");
    expect(res.status()).toBe(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await res.body()) as never);
    expect(workbook.worksheets.map((w) => w.name)).toEqual([...EXPORT_TABLES]);

    const jobs = workbook.getWorksheet("jobs")!;
    expect(jobs.rowCount).toBe(1 + 11);
    const headers = (jobs.getRow(1).values as string[]).filter(Boolean);
    expect(headers).toContain("id");
    expect(headers).toContain("budget_usd");
    expect(headers).not.toContain("owner_id");

    const expenses = workbook.getWorksheet("expenses")!;
    const head = expenses.getRow(1).values as string[];
    const amountCol = head.indexOf("amount_usd");
    const vendorCol = head.indexOf("vendor");
    const amounts = new Map<string, number>();
    expenses.eachRow((row, n) => {
      if (n > 1)
        amounts.set(
          String(row.getCell(vendorCol).value) + row.getCell(amountCol).value,
          Number(row.getCell(amountCol).value),
        );
    });
    expect([...amounts.values()]).toContain(460);
    expect([...amounts.values()]).toContain(1625);
  });

  test("per-table CSV has the same columns and escapes values", async ({
    page,
    user,
  }) => {
    await user.signIn(page);
    const res = await page.request.get("/api/exports/csv/expenses");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const lines = (await res.text()).trim().split("\r\n");
    expect(lines[0].split(",")).toContain("amount_usd");
    expect(lines).toHaveLength(1 + 9);
    expect(lines.some((l) => l.includes(",460.00,"))).toBe(true);
    expect(
      (await page.request.get("/api/exports/csv/not_a_table")).status(),
    ).toBe(404);
  });
});

test("exports page on the vehicle screen downloads each file", async ({
  page,
  user,
}) => {
  await seedDemo(adminClient(), user.id);
  await user.signIn(page);
  await page.goto("/vehicle");
  const exportsSection = page.getByRole("region", { name: "Exports" });

  const service = exportsSection.getByRole("form", {
    name: "Service history (PDF)",
  });
  await service.getByLabel("Costs").selectOption("0");
  let download = page.waitForEvent("download");
  await service.getByRole("button", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^service-history-.*\.pdf$/,
  );

  download = page.waitForEvent("download");
  await exportsSection
    .getByRole("form", { name: "Build sheet (PDF)" })
    .getByRole("button", { name: "Download PDF" })
    .click();
  expect((await download).suggestedFilename()).toMatch(/^build-sheet-.*\.pdf$/);

  download = page.waitForEvent("download");
  await exportsSection
    .getByRole("link", { name: "Download Excel (.xlsx)" })
    .click();
  expect((await download).suggestedFilename()).toMatch(
    /^cayenne-tracker-.*\.xlsx$/,
  );

  await exportsSection.getByLabel("One table as CSV").selectOption("parts");
  download = page.waitForEvent("download");
  await exportsSection.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^parts-.*\.csv$/);
});
