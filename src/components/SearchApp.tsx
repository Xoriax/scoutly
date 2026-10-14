"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FILTER_LABELS, hasAnyFilter, type SearchFilters } from "@/domain/filters";
import type { SearchResponse } from "@/lib/api-types";
import { formatInteger } from "@/lib/format";
import { parseSearchParams, toSearchParams, type SearchOptions } from "@/lib/search-params";
import { CompanyMap, type MapPoint } from "./CompanyMap";
import { ExportButton } from "./ExportButton";
import { Pagination } from "./Pagination";
import { ResultsTable } from "./ResultsTable";
import { SaveSearchButton } from "./SaveSearchButton";
import { SearchForm } from "./SearchForm";

type Outcome = { query: string } & ({ data: SearchResponse } | { error: string });
type View = "tableau" | "carte";

const VIEW_KEY = "scoutly.vue";

/**
 * Page de recherche : l'état (filtres + page) vit dans l'URL,
 * les données viennent de la route serveur /api/search.
 */
export function SearchApp({ exportMaxRows }: { exportMaxRows: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  const parsed = useMemo(() => parseSearchParams(new URLSearchParams(query)), [query]);
  const filters = parsed.ok && hasAnyFilter(parsed.filters) ? parsed.filters : null;
  const options: SearchOptions = parsed.ok ? parsed.options : {};

  // Résultat associé à la requête qui l'a produit : s'il ne correspond pas à l'URL, on charge
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const current = outcome?.query === query ? outcome : null;
  const loading = filters !== null && current === null;

  useEffect(() => {
    if (!filters) return;
    const controller = new AbortController();
    fetch(`/api/search?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        setOutcome(
          res.ok
            ? { query, data: body as SearchResponse }
            : { query, error: body.error ?? `Erreur ${res.status}` },
        );
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setOutcome({ query, error: "Impossible de joindre le serveur." });
        }
      });
    return () => controller.abort();
    // filters est dérivé de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hrefFor = (f: SearchFilters, p: number, o: SearchOptions) => {
    const qs = toSearchParams(f, p, o).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="flex flex-col gap-6">
      <SearchForm
        key={query}
        initialFilters={filters}
        initialOptions={options}
        onSubmit={(f, o) => router.push(hrefFor(f, 1, o))}
      />

      {!parsed.ok && <Alert tone="error">{parsed.error}</Alert>}

      {!filters && parsed.ok && (
        <p className="text-center text-sm text-slate-500">
          Renseignez au moins un critère puis lancez la recherche.
        </p>
      )}

      {loading && <LoadingState />}

      {current && "error" in current && <Alert tone="error">{current.error}</Alert>}

      {filters && current && "data" in current && (
        <Results
          result={current.data}
          searchQuery={query}
          criteriaQuery={toSearchParams(filters, 1, options).toString()}
          nameSuggestion={suggestName(filters)}
          exportMaxRows={exportMaxRows}
          hrefFor={(p) => hrefFor(filters, p, options)}
          onNavigate={(p) => router.push(hrefFor(filters, p, options))}
        />
      )}
    </div>
  );
}

function Results({
  result,
  searchQuery,
  criteriaQuery,
  nameSuggestion,
  exportMaxRows,
  hrefFor,
  onNavigate,
}: {
  result: SearchResponse;
  /** Paramètres complets de l'URL (page incluse) */
  searchQuery: string;
  /** Critères seuls, sans la page (export, sauvegarde) */
  criteriaQuery: string;
  nameSuggestion: string;
  exportMaxRows: number;
  hrefFor: (page: number) => string;
  onNavigate: (page: number) => void;
}) {
  const { companies, page, totalPages, total, totalIsApproximate, scanned, hasNextPage } = result;
  const truncated = totalPages !== null && total > totalPages * result.perPage;
  const localLabels = result.locallyFilteredFilters.map((k) => FILTER_LABELS[k]).join(", ");

  const [view, setView] = useState<View>("tableau");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(VIEW_KEY) === "carte") setView("carte");
    } catch {
      // Stockage indisponible : vue tableau par défaut
    }
  }, []);
  function changeView(next: View) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Préférence non mémorisée
    }
  }

  const retour = `?retour=${encodeURIComponent(searchQuery)}`;
  const points = useMemo<MapPoint[]>(
    () =>
      companies.flatMap((c) =>
        c.latitude != null && c.longitude != null
          ? [
              {
                siren: c.siren,
                nom: c.nom,
                latitude: c.latitude,
                longitude: c.longitude,
                detail: [c.ville, c.libelleNaf].filter(Boolean).join(" · "),
                href: `/entreprises/${c.siren}${retour}`,
              },
            ]
          : [],
      ),
    [companies, retour],
  );

  return (
    <section aria-label="Résultats" className="flex flex-col gap-4">
      {result.ignoredFilters.length > 0 && (
        <Alert tone="warning">
          Critères non pris en charge par la source de données actuelle, donc ignorés :{" "}
          <strong>{result.ignoredFilters.map((k) => FILTER_LABELS[k]).join(", ")}</strong>.
        </Alert>
      )}
      {result.locallyFilteredFilters.length > 0 &&
        (scanned ? (
          <Alert tone="info">
            <strong>{localLabels}</strong>
            {" : "}la source de données ne sait pas filtrer directement sur ces critères. Le
            serveur parcourt les résultats pour ne garder que les entreprises concernées : le
            nombre de lignes varie d&apos;une page à l&apos;autre, le total affiché est une
            estimation haute et la navigation se fait page par page.
          </Alert>
        ) : (
          <Alert tone="info">
            <strong>{localLabels}</strong>
            {" : "}ces critères ne sont pas gérés par la source de données et sont appliqués page
            par page. Certaines pages peuvent donc contenir moins de {result.perPage} résultats,
            voire aucun, et le total affiché est une estimation haute.
          </Alert>
        ))}
      {result.masques > 0 && (
        <Alert tone="info">
          {result.masques} entreprise{result.masques > 1 ? "s" : ""} déjà suivie
          {result.masques > 1 ? "s" : ""} masquée{result.masques > 1 ? "s" : ""} sur cette page.
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-700">
            {total === 0 ? (
              "Aucune entreprise trouvée."
            ) : (
              <>
                {totalIsApproximate ? "Jusqu'à " : ""}
                <strong className="text-slate-900">{formatInteger(total)}</strong> entreprise
                {total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
                {truncated && (
                  <span className="text-slate-500">
                    {" "}
                    (seules les {formatInteger(totalPages * result.perPage)} premières sont
                    consultables : affinez la recherche)
                  </span>
                )}
              </>
            )}
          </p>
          <SaveSearchButton query={criteriaQuery} suggestion={nameSuggestion} />
        </div>
        {total > 0 && <ExportButton query={criteriaQuery} maxRows={exportMaxRows} />}
      </div>

      {companies.length > 0 && (
        <div role="tablist" aria-label="Affichage" className="flex gap-1 self-start rounded-lg bg-slate-200/70 p-1 text-sm">
          {(["tableau", "carte"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => changeView(v)}
              className={`rounded-md px-3 py-1.5 font-medium ${
                view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v === "tableau" ? "Tableau" : "Carte"}
            </button>
          ))}
        </div>
      )}

      {companies.length > 0 ? (
        view === "tableau" ? (
          <ResultsTable companies={companies} searchQuery={searchQuery} suivis={result.suivis} />
        ) : (
          <div className="flex flex-col gap-2">
            <CompanyMap points={points} />
            <p className="text-xs text-slate-500">
              Sièges des entreprises de cette page.
              {points.length < companies.length &&
                ` ${companies.length - points.length} sans position connue (adresse non diffusible ou non géolocalisée).`}
            </p>
          </div>
        )
      ) : (
        total > 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            {scanned
              ? "Aucune autre entreprise ne correspond à ces critères."
              : "Aucun résultat sur cette page après filtrage."}
            {hasNextPage && " Essayez la page suivante."}
          </p>
        )
      )}

      {(page > 1 || hasNextPage) && (
        <Pagination
          key={page}
          page={page}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hrefFor={hrefFor}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
}

/** Nom proposé par défaut pour enregistrer la recherche */
function suggestName(filters: SearchFilters): string {
  const parts = [filters.q, filters.codesNaf?.join(", "), filters.sectionsNaf?.join(", ")].filter(Boolean);
  return parts.length > 0 ? String(parts.join(" · ")).slice(0, 120) : "Ma recherche";
}

function LoadingState() {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      Recherche en cours…
    </div>
  );
}

const TONES = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
} as const;

function Alert({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  );
}
