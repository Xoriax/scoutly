import { Mail, Pause, StickyNote, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Message, ProspectNote } from "@/domain/crm";
import type { Prospect } from "@/domain/prospect";
import { formatMoment } from "@/lib/format";

interface Event {
  key: string;
  at: string;
  icon: LucideIcon;
  titre: string;
  texte?: string;
  lien?: { href: string; label: string };
}

/** Historique de la relation : échanges, notes et ajout au portefeuille, du plus récent au plus ancien */
export function ProspectTimeline({
  prospect,
  messages,
  notes,
  sequenceActive,
}: {
  prospect: Prospect;
  messages: Message[];
  notes: ProspectNote[];
  sequenceActive: boolean;
}) {
  const events: Event[] = [
    ...messages.map((m): Event => ({
      key: `m${m.id}`,
      at: m.recuLe,
      icon: Mail,
      titre: `Email reçu${prospect.contact ? ` · ${prospect.contact}` : ""}`,
      texte: m.objet,
      lien: { href: `/messagerie?m=${m.id}`, label: "Lire l'échange" },
    })),
    ...notes.map((n): Event => ({ key: `n${n.id}`, at: n.createdAt, icon: StickyNote, titre: "Note", texte: n.corps })),
    {
      key: "added",
      at: prospect.createdAt,
      icon: UserPlus,
      titre: "Prospect ajouté au portefeuille",
      texte: prospect.origine ? "Depuis une recherche Scoutly" : "Saisi à la main",
    },
  ];
  if (messages.length > 0 && sequenceActive) {
    events.push({
      key: "pause",
      at: messages[0].recuLe,
      icon: Pause,
      titre: "Séquence mise en pause",
      texte: "Le contact a répondu. Aucune relance programmée ne partira.",
    });
  }
  events.sort((a, b) => b.at.localeCompare(a.at));

  return (
    <ol className="flex flex-col gap-5 p-5">
      {events.map(({ key, at, icon: Icon, titre, texte, lien }) => (
        <li key={key} className="flex gap-3">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-indigo-600" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{titre}</h3>
            <small className="block text-[11px] text-slate-500">{formatMoment(at)}</small>
            {texte && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{texte}</p>}
            {lien && (
              <Link href={lien.href} className="mt-1 inline-block text-xs font-medium text-indigo-700 hover:underline">
                {lien.label} →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
