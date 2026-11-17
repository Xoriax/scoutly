"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Données de démonstration (celles de la maquette) : chargement en un clic quand le portefeuille
 * est vide, retrait de ces seules données ensuite. Les vrais prospects ne sont jamais touchés.
 */
export function DemoControls({ loaded, empty }: { loaded: boolean; empty: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function run(method: "POST" | "DELETE") {
    setBusy(true);
    setError(false);
    const res = await fetch("/api/demo", { method }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(true);
    router.refresh();
  }

  if (!loaded && !empty) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <FlaskConical aria-hidden className="size-4" />
      {loaded ? (
        <>
          Les entreprises, échanges et actions fictifs de la maquette sont chargés.
          <button
            type="button"
            disabled={busy}
            onClick={() => run("DELETE")}
            className="font-medium text-indigo-700 underline disabled:opacity-50"
          >
            Retirer les données de démonstration
          </button>
        </>
      ) : (
        <>
          Portefeuille vide.
          <button
            type="button"
            disabled={busy}
            onClick={() => run("POST")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            Charger les données de démonstration
          </button>
        </>
      )}
      {error && <span role="alert" className="text-red-700">Opération impossible.</span>}
    </div>
  );
}
