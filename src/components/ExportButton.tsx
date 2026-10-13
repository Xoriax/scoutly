"use client";

import { useState } from "react";
import { formatInteger } from "@/lib/format";

type Format = "xlsx" | "csv";

interface Props {
  /** Critères de recherche (paramètres d'URL, sans la page) */
  query: string;
  maxRows: number;
}

type Status =
  | { state: "idle" }
  | { state: "loading"; format: Format }
  | { state: "done"; message: string; warning: boolean }
  | { state: "error"; message: string };

/** Télécharge l'export généré côté serveur (toutes les pages, pas seulement celle affichée) */
export function ExportButton({ query, maxRows }: Props) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const loading = status.state === "loading";

  async function download(format: Format) {
    setStatus({ state: "loading", format });
    try {
      const res = await fetch(`/api/export?${query}&format=${format}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ state: "error", message: body.error ?? `Erreur ${res.status}` });
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `scoutly-entreprises.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      const rows = Number(res.headers.get("X-Export-Rows") ?? 0);
      const truncated = res.headers.get("X-Export-Truncated");
      setStatus({
        state: "done",
        warning: truncated !== null,
        message:
          truncated === "limit"
            ? `${formatInteger(rows)} entreprises exportées : limite de ${formatInteger(maxRows)} lignes atteinte.`
            : truncated === "timeout"
              ? `${formatInteger(rows)} entreprises exportées : délai maximal atteint, liste incomplète.`
              : `${formatInteger(rows)} entreprise${rows > 1 ? "s" : ""} exportée${rows > 1 ? "s" : ""}.`,
      });
    } catch {
      setStatus({ state: "error", message: "Impossible de joindre le serveur." });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => download("xlsx")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
        >
          {loading && status.format === "xlsx" && <Spinner />}
          Exporter en Excel
        </button>
        <button
          type="button"
          onClick={() => download("csv")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {loading && status.format === "csv" && <Spinner dark />}
          CSV
        </button>
      </div>
      <p
        role={status.state === "error" ? "alert" : "status"}
        className={`text-xs ${
          status.state === "error"
            ? "text-red-700"
            : status.state === "done" && status.warning
              ? "text-amber-700"
              : "text-slate-500"
        }`}
      >
        {status.state === "loading" && "Export en cours… cela peut prendre jusqu'à une minute."}
        {status.state === "error" && status.message}
        {status.state === "done" && status.message}
        {status.state === "idle" &&
          `Tous les résultats de la recherche, jusqu'à ${formatInteger(maxRows)} lignes.`}
      </p>
    </div>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`h-4 w-4 animate-spin rounded-full border-2 ${
        dark ? "border-slate-300 border-t-slate-700" : "border-white/40 border-t-white"
      }`}
    />
  );
}
