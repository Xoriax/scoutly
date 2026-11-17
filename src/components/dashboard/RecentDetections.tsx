import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { NouvelleEntreprise } from "@/domain/prospect";
import { Empty, Panel } from "@/components/ui/Panel";
import { formatDate } from "@/lib/format";

/** Dernières entreprises détectées par les alertes des recherches surveillées */
export function RecentDetections({ items }: { items: (NouvelleEntreprise & { recherche: string })[] }) {
  return (
    <Panel
      title="Nouvelles entreprises détectées"
      action={
        <Link href="/recherches" aria-label="Ouvrir les recherches et alertes" className="text-indigo-700">
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      }
    >
      {items.length === 0 ? (
        <Empty>Aucune nouveauté pour l&apos;instant. Activez une alerte sur une recherche sauvegardée.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((n) => (
            <li key={`${n.recherche}-${n.siren}`} className="px-5 py-3">
              <Link href={`/entreprises/${n.siren}`} className="text-sm font-medium text-slate-900 hover:text-indigo-700">
                {n.nom}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {n.ville ?? "—"} · {n.recherche} · détectée le {formatDate(n.detecteeLe.slice(0, 10))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
