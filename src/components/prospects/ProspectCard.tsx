import { CalendarClock, Search } from "lucide-react";
import Link from "next/link";
import type { Prospect } from "@/domain/prospect";
import { Badge } from "@/components/ui/Badge";
import { formatEuros } from "@/lib/format";
import { ProspectStatusSelect } from "./ProspectStatusSelect";

/** Carte d'un prospect dans le pipeline */
export function ProspectCard({ prospect: p }: { prospect: Prospect }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div>
        <Link href={`/prospects/${p.siren}`} className="text-sm font-semibold text-indigo-700 hover:underline">
          {p.nom}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">
          {[p.contact, p.ville, p.secteur].filter(Boolean).join(" · ") || "Contact à renseigner"}
        </p>
      </div>
      {p.montant ? (
        <Badge tone="positive">{[formatEuros(p.montant), p.etape].filter(Boolean).join(" · ")}</Badge>
      ) : (
        <Badge>À qualifier : besoin et budget</Badge>
      )}
      {p.prochaineAction && (
        <p className="flex items-start gap-1.5 text-xs text-slate-600">
          <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          {p.prochaineAction}
        </p>
      )}
      {p.origine && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Search aria-hidden className="size-3 shrink-0" />
          Issu d&apos;une recherche Scoutly
        </p>
      )}
      <ProspectStatusSelect siren={p.siren} nom={p.nom} ville={p.ville} statut={p.statut} notes={p.notes} refresh />
    </article>
  );
}
