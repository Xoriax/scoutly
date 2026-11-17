import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SequenceBadges, SequenceRules, SequenceToggle } from "@/components/sequences/SequenceControls";
import { SequenceSteps } from "@/components/sequences/SequenceSteps";
import { Panel } from "@/components/ui/Panel";
import { listMessages } from "@/lib/messages";
import { listProspects } from "@/lib/prospects";
import { getSequence } from "@/lib/sequence";

export const metadata: Metadata = { title: "Séquences" };

export default function SequencesPage() {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Des relances au bon moment."
        description="Les règles travaillent pour vous. Vous gardez le contrôle."
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <Sequence />
      </Suspense>
    </main>
  );
}

async function Sequence() {
  await connection();
  const settings = getSequence();
  const noms = Object.fromEntries(listProspects().map((p) => [p.siren, p.nom]));
  const aValider = listMessages().filter((m) => !m.traite && m.brouillon);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel
        title="Premier contact · services B2B"
        subtitle="Parcours de démonstration"
        action={<SequenceToggle settings={settings} />}
      >
        <SequenceSteps header={<SequenceBadges settings={settings} />} />
      </Panel>
      <div className="flex flex-col gap-4">
        <SequenceRules settings={settings} />
        <Panel title="À valider" count={aValider.length}>
          {aValider.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Aucun brouillon en attente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {aValider.map((m) => (
                <li key={m.id} className="flex flex-col items-start gap-2 px-5 py-4 text-sm">
                  <p className="text-slate-900">Un brouillon attend votre relecture pour {noms[m.siren] ?? m.siren}.</p>
                  <Link
                    href={`/messagerie?m=${m.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Relire le brouillon <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
