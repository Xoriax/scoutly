"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tache } from "@/domain/crm";
import { Badge } from "@/components/ui/Badge";

export type TacheAvecProspect = Tache & { prospectNom: string };

interface Props {
  taches: TacheAvecProspect[];
  /** Masque le nom du prospect (liste affichée sur sa propre fiche) */
  sansProspect?: boolean;
  emptyText: string;
}

/** Actions à faire : une case à cocher termine (ou rouvre) l'action */
export function TaskList({ taches, sansProspect, emptyText }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function toggle(t: Tache) {
    setBusy(t.id);
    setError(false);
    const res = await fetch(`/api/taches/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminee: !t.terminee }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(true);
    router.refresh();
  }

  if (taches.length === 0) return <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyText}</p>;

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {taches.map((t) => (
          <li key={t.id} className="flex items-start gap-3 px-5 py-3.5">
            <input
              type="checkbox"
              checked={t.terminee}
              disabled={busy === t.id}
              onChange={() => toggle(t)}
              aria-label={`${t.terminee ? "Rouvrir" : "Terminer"} : ${t.titre}`}
              className="mt-1 size-4 accent-indigo-600"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/prospects/${t.siren}`}
                className={`text-sm font-medium hover:text-indigo-700 ${t.terminee ? "text-slate-400 line-through" : "text-slate-900"}`}
              >
                {t.titre}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {[!sansProspect && t.prospectNom, t.raison].filter(Boolean).join(" · ")}
              </p>
              {(t.etiquette || t.echeance) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {t.etiquette && <Badge tone={t.terminee ? "neutral" : "warning"}>{t.etiquette}</Badge>}
                  {t.echeance}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="px-5 pb-3 text-xs text-red-700">
          Mise à jour impossible, réessayez.
        </p>
      )}
    </>
  );
}
