import { ContactRound } from "lucide-react";
import Link from "next/link";
import type { Message } from "@/domain/crm";
import type { Prospect } from "@/domain/prospect";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { formatMoment } from "@/lib/format";
import { MailDraft } from "./MailDraft";

/** Échange ouvert : en-tête, message, analyse et brouillon */
export function MailView({ message, prospect, sequenceActive }: { message: Message; prospect: Prospect | null; sequenceActive: boolean }) {
  return (
    <Panel
      title={message.objet}
      subtitle={prospect ? [prospect.contact, prospect.nom].filter(Boolean).join(" · ") : message.siren}
      action={
        prospect && (
          <Link
            href={`/prospects/${prospect.siren}`}
            aria-label="Voir la fiche prospect"
            title="Voir la fiche prospect"
            className="text-indigo-700"
          >
            <ContactRound aria-hidden className="size-5" />
          </Link>
        )
      }
    >
      <div className="p-5">
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          De : {prospect?.email || "—"}
          <br />
          Reçu : {formatMoment(message.recuLe)}
        </p>
        <div className="flex flex-col gap-3 text-sm text-slate-900">
          {message.corps.split(/\n\n+/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
        {sequenceActive && (
          <div className="mt-4">
            <Badge tone="positive">Séquence suspendue · réponse reçue</Badge>
          </div>
        )}
      </div>
      <MailDraft key={message.id} message={message} />
    </Panel>
  );
}
