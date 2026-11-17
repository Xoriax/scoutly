import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Journey } from "@/components/layout/Journey";
import { PageHeader } from "@/components/layout/PageHeader";
import { MailForm } from "@/components/messaging/MailForm";
import { MailList } from "@/components/messaging/MailList";
import { MailView } from "@/components/messaging/MailView";
import { Empty, Panel } from "@/components/ui/Panel";
import { listMessages } from "@/lib/messages";
import { getProspect, listProspects } from "@/lib/prospects";
import { getSequence } from "@/lib/sequence";

export const metadata: Metadata = { title: "Messagerie" };

export default function InboxPage({ searchParams }: PageProps<"/messagerie">) {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Journey active="inbox" />
      <PageHeader
        title="Chaque réponse compte."
        description="Vos échanges, leur contexte et la prochaine action."
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/messagerie">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const raw = Array.isArray(params.m) ? params.m[0] : params.m;

  const messages = listMessages();
  const prospects = listProspects();
  const noms = Object.fromEntries(prospects.map((p) => [p.siren, p.nom]));
  const selected = messages.find((m) => String(m.id) === raw) ?? messages[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <MailForm prospects={prospects.map((p) => ({ siren: p.siren, nom: p.nom }))} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <MailList messages={messages} noms={noms} selectedId={selected?.id ?? null} />
        {selected ? (
          <MailView
            message={selected}
            prospect={getProspect(selected.siren)}
            sequenceActive={getSequence().active}
          />
        ) : (
          <Panel>
            <Empty>Sélectionnez un échange pour voir son analyse et préparer la réponse.</Empty>
          </Panel>
        )}
      </div>
    </div>
  );
}
