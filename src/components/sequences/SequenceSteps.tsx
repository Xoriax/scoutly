import { Clock3, Mail, Phone, Send, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const STEPS: { icon: LucideIcon; titre: string; texte: string; note?: string }[] = [
  { icon: Mail, titre: "J0 · Premier email", texte: "Présentation courte, personnalisée à partir de la fiche.", note: "Brouillon à valider" },
  { icon: Clock3, titre: "Attendre 3 jours ouvrés", texte: "Arrêt de la séquence si le contact répond." },
  { icon: Send, titre: "J+3 · Relance avec un exemple", texte: "Un cas d'usage adapté au secteur de l'entreprise.", note: "Brouillon à valider" },
  { icon: Phone, titre: "J+7 · Créer une tâche d'appel", texte: "Attribuée au responsable du prospect." },
];

/** Étapes de la séquence « Premier contact » */
export function SequenceSteps({ header }: { header: ReactNode }) {
  return (
    <ol className="p-5">
      <li className="mb-5 list-none">{header}</li>
      {STEPS.map(({ icon: Icon, titre, texte, note }, i) => (
        <li key={titre} className="relative flex list-none gap-3 pb-5 last:pb-0">
          {i < STEPS.length - 1 && <span aria-hidden className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px bg-slate-200" />}
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
            <Icon aria-hidden className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{titre}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{texte}</p>
            {note && <small className="mt-0.5 block text-[11px] text-slate-500">{note}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
