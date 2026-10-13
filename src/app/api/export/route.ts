import type { NextRequest } from "next/server";
import { FILTER_LABELS, hasAnyFilter } from "@/domain/filters";
import { badRequest, errorResponse } from "@/lib/api-errors";
import { collectAll, exportMaxRows } from "@/lib/export/collect";
import { describeFilters } from "@/lib/export/criteria";
import { buildCsv } from "@/lib/export/csv";
import { buildXlsx } from "@/lib/export/xlsx";
import { formatInteger } from "@/lib/format";
import { parseSearchParams } from "@/lib/search-params";
import { getProvider } from "@/providers";

/**
 * GET /api/export?<critères de recherche>&format=xlsx|csv
 * Exporte tous les résultats de la recherche (dans la limite de EXPORT_MAX_ROWS).
 * En-têtes X-Export-Rows et X-Export-Truncated (limit | timeout) pour l'interface.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "xlsx";
  if (format !== "xlsx" && format !== "csv") return badRequest("Format inconnu (xlsx ou csv)");

  const parsed = parseSearchParams(searchParams);
  if (!parsed.ok) return badRequest(parsed.error);
  if (!hasAnyFilter(parsed.filters)) return badRequest("Indiquez au moins un critère de recherche.");

  try {
    const provider = getProvider();
    const collected = await collectAll(provider, parsed.filters);
    const { companies, truncated } = collected;

    const date = new Date().toISOString().slice(0, 10);
    const filename = `scoutly-entreprises-${date}.${format}`;
    const headers = new Headers({
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Export-Rows": String(companies.length),
    });
    if (truncated) headers.set("X-Export-Truncated", truncated);

    if (format === "csv") {
      headers.set("Content-Type", "text/csv; charset=utf-8");
      return new Response(buildCsv(companies), { headers });
    }

    const warnings: string[] = [];
    if (truncated === "limit") {
      warnings.push(
        `Export limité aux ${formatInteger(exportMaxRows())} premières entreprises (EXPORT_MAX_ROWS).`,
      );
    }
    if (truncated === "timeout") {
      warnings.push("Export interrompu après le délai maximal : la liste est incomplète.");
    }
    if (collected.ignoredFilters.length > 0) {
      warnings.push(
        `Critères ignorés par la source : ${collected.ignoredFilters.map((k) => FILTER_LABELS[k]).join(", ")}.`,
      );
    }

    const info: [string, string][] = [
      ["Date de l'export", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
      ["Source de données", provider.name],
      ["Entreprises exportées", formatInteger(companies.length)],
      ...(await describeFilters(parsed.filters)),
    ];

    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const buffer = await buildXlsx(companies, { info, warnings });
    return new Response(new Uint8Array(buffer), { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
