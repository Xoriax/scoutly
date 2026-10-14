import type { Company } from "@/domain/company";
import { STATUT_LABELS, type ProspectStatut } from "@/domain/prospect";

/** Éléments d'affichage partagés (composants serveur et client) */

/** "356000000" → "356 000 000" */
export function formatSiren(siren: string): string {
  return siren.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}

/** "Unité non employeuse (pas de salarié…)" → "Unité non employeuse" */
export function shortEffectif(label: string | null): string {
  if (!label) return "—";
  return label.replace(/\s*\(.*\)\s*$/, "");
}

export function EtatBadge({ etat }: { etat: Company["etatAdministratif"] }) {
  return etat === "active" ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
      Cessée
    </span>
  );
}

export const STATUT_STYLES: Record<ProspectStatut, string> = {
  a_contacter: "bg-sky-50 text-sky-800 ring-sky-200",
  contacte: "bg-amber-50 text-amber-800 ring-amber-200",
  interesse: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pas_interesse: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatutBadge({ statut }: { statut: ProspectStatut }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUT_STYLES[statut]}`}
    >
      {STATUT_LABELS[statut]}
    </span>
  );
}
