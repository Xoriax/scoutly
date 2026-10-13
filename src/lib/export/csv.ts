import "server-only";
import type { Company } from "@/domain/company";
import { formatDate } from "@/lib/format";
import { columnsFor } from "./columns";

/**
 * CSV pour Excel en français : séparateur « ; », BOM UTF-8 (accents corrects),
 * fins de ligne CRLF, dates JJ/MM/AAAA.
 */
export function buildCsv(companies: Company[]): string {
  const columns = columnsFor(companies);
  const lines = [
    columns.map((col) => escape(col.header)),
    ...companies.map((company) =>
      columns.map((col) => {
        const value = col.value(company);
        if (value === null) return "";
        if (col.kind === "date" && typeof value === "string") return formatDate(value);
        return escape(String(value));
      }),
    ),
  ];
  return "﻿" + lines.map((cells) => cells.join(";")).join("\r\n") + "\r\n";
}

function escape(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
