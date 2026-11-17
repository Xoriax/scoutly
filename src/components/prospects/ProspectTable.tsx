import Link from "next/link";
import type { Prospect } from "@/domain/prospect";
import { formatEuros } from "@/lib/format";
import { ProspectStatusSelect } from "./ProspectStatusSelect";

/** Vue liste des prospects */
export function ProspectTable({ prospects }: { prospects: Prospect[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3">Entreprise / contact</th>
            <th scope="col" className="px-4 py-3">Statut</th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">Prochaine action</th>
            <th scope="col" className="hidden px-4 py-3 text-right md:table-cell">Opportunité</th>
            <th scope="col" className="hidden px-4 py-3 lg:table-cell">Notes</th>
            <th scope="col" className="hidden px-4 py-3 lg:table-cell">Modifié le</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {prospects.map((p) => (
            <tr key={p.siren} className="align-top">
              <td className="px-4 py-3">
                <Link href={`/prospects/${p.siren}`} className="font-medium text-indigo-700 hover:underline">
                  {p.nom}
                </Link>
                <div className="text-xs text-slate-500">
                  {[p.contact, p.ville].filter(Boolean).join(" · ") || <span className="font-mono">{p.siren}</span>}
                </div>
                {/* Colonnes masquées sur petit écran : l'essentiel passe sous le nom */}
                {(p.prochaineAction || p.montant) && (
                  <div className="mt-1 text-xs text-slate-600 md:hidden">
                    {[p.prochaineAction, p.montant ? formatEuros(p.montant) : ""].filter(Boolean).join(" · ")}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <ProspectStatusSelect siren={p.siren} nom={p.nom} ville={p.ville} statut={p.statut} notes={p.notes} refresh />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">{p.prochaineAction || "—"}</td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums md:table-cell">{p.montant ? formatEuros(p.montant) : "—"}</td>
              <td className="hidden max-w-xs whitespace-pre-line px-4 py-3 text-slate-600 lg:table-cell">
                {p.notes ? (p.notes.length > 200 ? `${p.notes.slice(0, 200)}…` : p.notes) : "—"}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell">
                {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
