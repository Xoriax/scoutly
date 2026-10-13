import "server-only";
import ExcelJS from "exceljs";
import type { Company } from "@/domain/company";
import { columnsFor, type ExportColumn } from "./columns";

export interface ExportSummary {
  /** Lignes affichées dans l'onglet « Recherche » */
  info: [string, string][];
  /** Avertissements (export tronqué, critères ignorés…) */
  warnings: string[];
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4F46E5" },
};

/** "2021-03-15" → Date UTC (Excel l'affiche sans décalage horaire) */
function isoToDate(iso: string): Date | string {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : iso;
}

function cellValue(col: ExportColumn, company: Company): ExcelJS.CellValue {
  const value = col.value(company);
  if (value === null) return null;
  if (col.kind === "date" && typeof value === "string") return isoToDate(value);
  return value;
}

export async function buildXlsx(companies: Company[], summary: ExportSummary): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const columns = columnsFor(companies);
  const sheet = workbook.addWorksheet("Entreprises", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 3 }],
  });
  sheet.columns = columns.map((col) => ({
    header: col.header,
    width: col.width,
    style:
      col.kind === "euros"
        ? { numFmt: '#,##0 "€";-#,##0 "€"' }
        : col.kind === "date"
          ? { numFmt: "dd/mm/yyyy" }
          : col.kind === "integer"
            ? { numFmt: "0" }
            : {},
  }));

  for (const company of companies) {
    sheet.addRow(columns.map((col) => cellValue(col, company)));
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Onglet récapitulatif : critères, date, avertissements
  const recap = workbook.addWorksheet("Recherche");
  recap.columns = [{ width: 34 }, { width: 90 }];
  const title = recap.addRow(["Export Scoutly"]);
  title.font = { bold: true, size: 14 };
  recap.addRow([]);
  for (const [label, value] of summary.info) {
    const row = recap.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true };
  }
  if (summary.warnings.length > 0) {
    recap.addRow([]);
    for (const warning of summary.warnings) {
      const row = recap.addRow(["Attention", warning]);
      row.font = { color: { argb: "FFB45309" } };
      row.getCell(1).font = { bold: true, color: { argb: "FFB45309" } };
      row.getCell(2).alignment = { wrapText: true };
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
