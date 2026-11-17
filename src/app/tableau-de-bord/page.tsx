import { ArrowRight, ArrowUpRight, BarChart3, CircleCheck, Inbox, ListTodo, Plus, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AssistantPanel } from "@/components/dashboard/AssistantPanel";
import { DemoControls } from "@/components/dashboard/DemoControls";
import { LatestReplies } from "@/components/dashboard/LatestReplies";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentDetections } from "@/components/dashboard/RecentDetections";
import { SearchResume } from "@/components/dashboard/SearchResume";
import { TaskList, type TacheAvecProspect } from "@/components/dashboard/TaskList";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { getDashboardStats } from "@/lib/dashboard";
import { hasDemo } from "@/lib/demo";
import { formatEuros } from "@/lib/format";
import { listMessages } from "@/lib/messages";
import { listProspects } from "@/lib/prospects";
import { listTaches } from "@/lib/tasks";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

async function Dashboard() {
  await connection();
  const stats = getDashboardStats();
  const prospects = listProspects();
  const noms = Object.fromEntries(prospects.map((p) => [p.siren, p.nom]));
  const taches: TacheAvecProspect[] = listTaches({ aFaire: true }).map((t) => ({ ...t, prospectNom: noms[t.siren] ?? t.siren }));
  const messages = listMessages();
  const aRegarder = messages.find((m) => !m.traite && m.analyse);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <SearchResume />
      <PageHeader
        title="Une journée bien engagée."
        description={`${today.charAt(0).toUpperCase()}${today.slice(1)} · Vos prochains échanges commencent ici.`}
        action={
          <Link
            href="/prospects/nouveau"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus aria-hidden className="size-4" /> Nouveau prospect
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Prospects actifs" icon={Users} value={stats.prospects} hint={`${stats.enDiscussion} en discussion`} />
          <MetricCard
            label="Actions du jour"
            icon={CircleCheck}
            value={stats.actionsAFaire}
            hint={stats.actionsAFaire ? "Prochaines étapes à suivre" : "Tout est à jour"}
            hintTone={stats.actionsAFaire ? "warning" : "default"}
          />
          <MetricCard label="Emails à traiter" icon={Inbox} value={stats.messagesATraiter} hint="Dans votre messagerie" />
          <MetricCard
            label="Pipeline commercial"
            icon={BarChart3}
            value={<>{formatEuros(stats.pipelineMontant).replace(/\s?€$/, "")} <span className="text-base">€</span></>}
            hint={`${plural(stats.opportunites, "opportunité")} ${stats.opportunites > 1 ? "ouvertes" : "ouverte"}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Panel
            title="Vos priorités"
            count={taches.length}
            subtitle="Chaque action a une raison."
            action={<ListTodo aria-hidden className="size-4 text-slate-500" />}
          >
            <TaskList taches={taches} emptyText="Toutes les actions du jour sont terminées." />
            <div className="border-t border-slate-100 px-5 py-3">
              <Link href="/prospects" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline">
                Voir tous les prospects <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          </Panel>
          <div className="flex flex-col gap-4">
            {aRegarder && <AssistantPanel message={aRegarder} nom={noms[aRegarder.siren] ?? aRegarder.siren} />}
            <LatestReplies messages={messages.slice(0, 2)} noms={noms} />
          </div>
        </div>

        <RecentDetections items={stats.recentes} />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4" />
            Aucun email envoyé sans votre validation · messagerie en simulation.
          </span>
          <Link href="/sequences" className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
            Gérer les automatisations <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <DemoControls loaded={hasDemo()} empty={stats.prospects === 0} />
      </div>
    </>
  );
}
