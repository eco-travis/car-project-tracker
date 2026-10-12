import "server-only";
import ExcelJS from "exceljs";
import type { createClient } from "@/lib/db/server";
import {
  EXPORT_TABLES,
  csvCell,
  exportHeader,
  exportValue,
  type ExportTable,
} from "@/lib/domain/exports";
import { loadTable } from "./data";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Columns for a table: from its rows, owner_id dropped (always the same user). */
function columnsOf(
  rows: Record<string, unknown>[],
  fallback: string[] = ["id"],
): string[] {
  const cols = rows.length ? Object.keys(rows[0]) : fallback;
  return cols.filter((c) => c !== "owner_id");
}

/** Full data export: one sheet per table, ids included, money as dollars with 2 decimals. */
export async function buildWorkbook(supabase: Supabase): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cayenne Project Tracker";
  workbook.created = new Date();
  for (const table of EXPORT_TABLES) {
    const rows = await loadTable(supabase, table);
    const columns = columnsOf(rows);
    const sheet = workbook.addWorksheet(table);
    sheet.columns = columns.map((c) => ({
      header: exportHeader(c),
      key: c,
      width: Math.min(Math.max(exportHeader(c).length + 2, 12), 40),
      style: c.endsWith("_cents") ? { numFmt: "0.00" } : undefined,
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of rows)
      sheet.addRow(
        Object.fromEntries(columns.map((c) => [c, exportValue(c, row[c])])),
      );
  }
  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

/** Per-table CSV, same columns as its sheet. */
export async function buildCsv(
  supabase: Supabase,
  table: ExportTable,
): Promise<string> {
  const rows = await loadTable(supabase, table);
  const columns = columnsOf(rows);
  const lines = [columns.map((c) => csvCell("", exportHeader(c))).join(",")];
  for (const row of rows)
    lines.push(columns.map((c) => csvCell(c, row[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}
