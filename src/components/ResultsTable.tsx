import Link from "next/link";
import type { Company } from "@/domain/company";
import { formatDate, formatEuros } from "@/lib/format";

export function ResultsTable({ companies }: { companies: Company[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3">Entreprise</th>
            <th scope="col" className="px-4 py-3">Activité</th>
            <th scope="col" className="px-4 py-3">Siège</th>
            <th scope="col" className="px-4 py-3">Effectif</th>
            <th scope="col" className="px-4 py-3">Création</th>
            <th scope="col" className="px-4 py-3">Forme juridique</th>
            <th scope="col" className="px-4 py-3 text-right">Chiffre d&apos;affaires</th>
            <th scope="col" className="px-4 py-3">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {companies.map((c) => (
            <tr key={c.siren} className="align-top hover:bg-indigo-50/40">
              <td className="max-w-xs px-4 py-3">
                <Link
                  href={`/entreprises/${c.siren}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {c.nom}
                </Link>
                <div className="font-mono text-xs text-slate-500">{formatSiren(c.siren)}</div>
              </td>
              <td className="max-w-xs px-4 py-3">
                <div>{c.libelleNaf ?? "—"}</div>
                {c.codeNaf && <div className="font-mono text-xs text-slate-500">{c.codeNaf}</div>}
              </td>
              <td className="px-4 py-3">
                <div className="whitespace-nowrap">{c.ville ?? "—"}</div>
                {c.codePostal && <div className="text-xs text-slate-500">{c.codePostal}</div>}
                <EtablissementDansZone company={c} />
              </td>
              <td className="px-4 py-3">{shortEffectif(c.trancheEffectif)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(c.dateCreation)}</td>
              <td className="max-w-[12rem] px-4 py-3">{c.formeJuridique ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                {formatEuros(c.chiffreAffaires, true)}
                {c.anneeFinances && (
                  <div className="text-xs text-slate-500">{c.anneeFinances}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <EtatBadge etat={c.etatAdministratif} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Siège hors de la zone recherchée : on montre l'établissement qui, lui, s'y trouve.
 */
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

/** "356000000" → "356 000 000" */
export function formatSiren(siren: string): string {
  return siren.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}

function shortEffectif(label: string | null): string {
  if (!label) return "—";
  return label.replace(/\s*\(.*\)\s*$/, "");
}
