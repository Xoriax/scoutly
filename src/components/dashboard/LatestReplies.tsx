import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Message } from "@/domain/crm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Empty, Panel } from "@/components/ui/Panel";
import { formatShort } from "@/lib/format";
import { messageBadge, messagePreview } from "@/components/messaging/preview";

/** Derniers échanges reçus, avec un lien vers la messagerie */
export function LatestReplies({ messages, noms }: { messages: Message[]; noms: Record<string, string> }) {
  return (
    <Panel
      title="Dernières réponses"
      action={
        <Link href="/messagerie" aria-label="Ouvrir la messagerie" className="text-indigo-700">
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      }
    >
      {messages.length === 0 ? (
        <Empty>Aucun échange pour l&apos;instant.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {messages.map((m) => (
            <li key={m.id}>
              <Link href={`/messagerie?m=${m.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50">
                <Avatar name={noms[m.siren] ?? "?"} />
                <div className="min-w-0 flex-1">
                  <strong className="text-xs font-semibold text-slate-900">{noms[m.siren] ?? m.siren}</strong>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{messagePreview(m)}</p>
                  <div className="mt-1.5">
                    <Badge tone={messageBadge(m).positive ? "positive" : "neutral"}>{messageBadge(m).label}</Badge>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">{formatShort(m.recuLe)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
