import { KanbanSquare, List, Search } from "lucide-react";
import Link from "next/link";
import { PROSPECT_STATUTS, STATUT_LABELS, type ProspectStatut } from "@/domain/prospect";

export type ProspectView = "pipeline" | "liste";

interface Props {
  q: string;
  statut: ProspectStatut | null;
  view: ProspectView;
  counts: Record<ProspectStatut, number>;
  total: number;
}

/** URL de la page prospects avec ses filtres (état partageable, aucun JavaScript requis) */
export function prospectsHref({ q, statut, view }: Pick<Props, "q" | "statut" | "view">): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (statut) params.set("statut", statut);
  if (view !== "pipeline") params.set("vue", view);
  const qs = params.toString();
  return qs ? `/prospects?${qs}` : "/prospects";
}

/** Recherche, filtre par statut et choix de la vue (pipeline / liste) */
export function ProspectToolbar({ q, statut, view, counts, total }: Props) {
  const chip = (value: ProspectStatut | null, label: string, count: number) => (
    <Link
      key={value ?? "tous"}
      href={prospectsHref({ q, statut: value, view })}
      aria-current={statut === value ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        statut === value ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </Link>
  );

  const viewLink = (value: ProspectView, label: string, Icon: typeof List) => (
    <Link
      href={prospectsHref({ q, statut, view: value })}
      aria-current={view === value ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
        view === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
      }`}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action="/prospects" className="relative min-w-48 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Rechercher un prospect"
            placeholder="Entreprise, contact, ville…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
          {statut && <input type="hidden" name="statut" value={statut} />}
          {view !== "pipeline" && <input type="hidden" name="vue" value={view} />}
        </form>
        <div aria-label="Vue du portefeuille" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {viewLink("pipeline", "Pipeline", KanbanSquare)}
          {viewLink("liste", "Liste", List)}
        </div>
      </div>
      <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {chip(null, "Tous", total)}
        {PROSPECT_STATUTS.map((s) => chip(s, STATUT_LABELS[s], counts[s]))}
      </nav>
    </div>
  );
}
