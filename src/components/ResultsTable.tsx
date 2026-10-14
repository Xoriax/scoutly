"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Company } from "@/domain/company";
import type { ProspectStatut } from "@/domain/prospect";
import { TRANCHE_ORDER } from "@/data/referentiels/labels";
import { formatDate, formatEuros } from "@/lib/format";
import { EtatBadge, formatSiren, shortEffectif } from "./company-format";
import { ProspectStatusSelect } from "./ProspectStatusSelect";

type SortValue = string | number | null;

interface Column {
  id: string;
  label: string;
  /** Valeur de tri ; absente = colonne non triable */
  sort?: (c: Company) => SortValue;
  render: (c: Company, ctx: RenderContext) => ReactNode;
  defaultVisible: boolean;
  /** Toujours affichée, non masquable */
  fixed?: boolean;
  className?: string;
}

interface RenderContext {
  retour: string;
  suivis: Record<string, ProspectStatut>;
}

const trancheRank = (code: string | null) =>
  code ? TRANCHE_ORDER.indexOf(code as (typeof TRANCHE_ORDER)[number]) : null;

const COLUMNS: Column[] = [
  {
    id: "entreprise",
    label: "Entreprise",
    fixed: true,
    defaultVisible: true,
    sort: (c) => c.nom,
    className: "max-w-xs",
    render: (c, { retour }) => (
      <>
        <Link href={`/entreprises/${c.siren}${retour}`} className="font-medium text-indigo-700 hover:underline">
          {c.nom}
        </Link>
        <div className="font-mono text-xs text-slate-500">{formatSiren(c.siren)}</div>
      </>
    ),
  },
  {
    id: "activite",
    label: "Activité",
    defaultVisible: true,
    sort: (c) => c.libelleNaf,
    className: "max-w-xs",
    render: (c) => (
      <>
        <div>{c.libelleNaf ?? "—"}</div>
        {c.codeNaf && <div className="font-mono text-xs text-slate-500">{c.codeNaf}</div>}
      </>
    ),
  },
  {
    id: "siege",
    label: "Siège",
    defaultVisible: true,
    sort: (c) => c.ville,
    render: (c) => (
      <>
        <div className="whitespace-nowrap">{c.ville ?? "—"}</div>
        {c.codePostal && <div className="text-xs text-slate-500">{c.codePostal}</div>}
        <EtablissementDansZone company={c} />
      </>
    ),
  },
  {
    id: "effectif",
    label: "Effectif",
    defaultVisible: true,
    sort: (c) => trancheRank(c.trancheEffectifCode),
    render: (c) => shortEffectif(c.trancheEffectif),
  },
  {
    id: "creation",
    label: "Création",
    defaultVisible: true,
    sort: (c) => c.dateCreation,
    className: "whitespace-nowrap",
    render: (c) => formatDate(c.dateCreation),
  },
  {
    id: "forme",
    label: "Forme juridique",
    defaultVisible: false,
    sort: (c) => c.formeJuridique,
    className: "max-w-[12rem]",
    render: (c) => c.formeJuridique ?? "—",
  },
  {
    id: "ca",
    label: "Chiffre d'affaires",
    defaultVisible: true,
    sort: (c) => c.chiffreAffaires ?? null,
    className: "whitespace-nowrap text-right tabular-nums",
    render: (c) => (
      <>
        {formatEuros(c.chiffreAffaires, true)}
        {c.anneeFinances && <div className="text-xs text-slate-500">{c.anneeFinances}</div>}
      </>
    ),
  },
  {
    id: "dirigeant",
    label: "Dirigeant principal",
    defaultVisible: false,
    sort: (c) => c.dirigeants[0]?.nom ?? null,
    className: "max-w-[14rem]",
    render: (c) => {
      const d = c.dirigeants[0];
      if (!d) return "—";
      return (
        <>
          <div>{d.nom}</div>
          {d.fonction && <div className="text-xs text-slate-500">{d.fonction}</div>}
        </>
      );
    },
  },
  {
    id: "labels",
    label: "Labels",
    defaultVisible: false,
    render: (c) => (c.labels?.length ? c.labels.join(", ") : "—"),
  },
  {
    id: "etat",
    label: "État",
    defaultVisible: false,
    sort: (c) => c.etatAdministratif,
    render: (c) => <EtatBadge etat={c.etatAdministratif} />,
  },
  {
    id: "suivi",
    label: "Suivi",
    defaultVisible: true,
    render: (c, { suivis }) => (
      <ProspectStatusSelect
        key={`${c.siren}-${suivis[c.siren] ?? ""}`}
        siren={c.siren}
        nom={c.nom}
        ville={c.ville}
        statut={suivis[c.siren] ?? null}
      />
    ),
  },
];

const STORAGE_KEY = "scoutly.colonnes";
const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);

function readStoredColumns(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(ids) ? ids.filter((id) => COLUMNS.some((c) => c.id === id)) : null;
  } catch {
    return null;
  }
}

interface Props {
  companies: Company[];
  /** Paramètres de la recherche en cours, transmis à la fiche pour le « Retour aux résultats » */
  searchQuery: string;
  suivis: Record<string, ProspectStatut>;
}

export function ResultsTable({ companies, searchQuery, suivis }: Props) {
  const [visible, setVisible] = useState<string[]>(DEFAULT_VISIBLE);
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null);

  // Préférences relues après l'hydratation (localStorage n'existe pas côté serveur)
  useEffect(() => {
    const stored = readStoredColumns();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setVisible(stored);
  }, []);

  function toggleColumn(id: string) {
    const next = visible.includes(id) ? visible.filter((v) => v !== id) : [...visible, id];
    setVisible(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible (navigation privée…) : préférence non mémorisée
    }
  }

  const columns = COLUMNS.filter((c) => c.fixed || visible.includes(c.id));
  const retour = searchQuery ? `?retour=${encodeURIComponent(searchQuery)}` : "";

  const rows = useMemo(() => {
    const column = sort && COLUMNS.find((c) => c.id === sort.id);
    if (!column?.sort || !sort) return companies;
    const value = column.sort;
    return [...companies].sort((a, b) => compare(value(a), value(b), sort.dir));
  }, [companies, sort]);

  function toggleSort(id: string) {
    setSort((s) => (s?.id !== id ? { id, dir: 1 } : s.dir === 1 ? { id, dir: -1 } : null));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {sort ? "Tri appliqué aux résultats de cette page." : "Cliquez sur un en-tête pour trier la page."}
        </span>
        <ColumnPicker visible={visible} onToggle={toggleColumn} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={
                    sort?.id === col.id ? (sort.dir === 1 ? "ascending" : "descending") : undefined
                  }
                  className={`px-4 py-3 ${col.id === "ca" ? "text-right" : ""}`}
                >
                  {col.sort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className="inline-flex items-center gap-1 uppercase hover:text-indigo-700"
                    >
                      {col.label}
                      <span aria-hidden className="text-slate-400">
                        {sort?.id === col.id ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((c) => (
              <tr key={c.siren} className="align-top hover:bg-indigo-50/40">
                {columns.map((col) => (
                  <td key={col.id} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {col.render(c, { retour, suivis })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tri croissant (dir = 1) ou décroissant (dir = -1), valeurs manquantes toujours en fin */
function compare(a: SortValue, b: SortValue, dir: 1 | -1): number {
  if (a === null || a === "") return b === null || b === "" ? 0 : 1;
  if (b === null || b === "") return -1;
  const result =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "fr", { sensitivity: "base", numeric: true });
  return result * dir;
}

function ColumnPicker({ visible, onToggle }: { visible: string[]; onToggle: (id: string) => void }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Colonnes ▾
      </summary>
      <fieldset className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
        <legend className="sr-only">Colonnes affichées</legend>
        {COLUMNS.filter((c) => !c.fixed).map((col) => (
          <label
            key={col.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={visible.includes(col.id)}
              onChange={() => onToggle(col.id)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            {col.label}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

/** Siège hors de la zone recherchée : on montre l'établissement qui, lui, s'y trouve */
function EtablissementDansZone({ company }: { company: Company }) {
  const etablissements = company.etablissementsDansZone ?? [];
  if (etablissements.length === 0 || etablissements.some((e) => e.estSiege)) return null;
  const [first, ...others] = etablissements;
  return (
    <div className="mt-1.5 max-w-[16rem] rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 ring-1 ring-amber-200">
      <span className="font-medium">
        {first.ouvert ? "Établissement dans la zone" : "Établissement fermé dans la zone"}
      </span>
      <div>
        {[first.adresse, [first.codePostal, first.ville].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ")}
      </div>
      {others.length > 0 && (
        <div className="text-amber-700">
          + {others.length} autre{others.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
