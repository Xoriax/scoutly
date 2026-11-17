import { ArrowLeft, ArrowUpRight, Search, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TaskList } from "@/components/dashboard/TaskList";
import { ProspectEditor } from "@/components/prospects/ProspectEditor";
import { ProspectStatusSelect } from "@/components/prospects/ProspectStatusSelect";
import { ProspectTimeline } from "@/components/prospects/ProspectTimeline";
import { NoteForm } from "@/components/prospects/NoteForm";
import { TaskForm } from "@/components/prospects/TaskForm";
import { formatSiren } from "@/components/company/company-format";
import { Avatar } from "@/components/ui/Avatar";
import { Panel } from "@/components/ui/Panel";
import { isProspectKey } from "@/domain/prospect";
import { loadCompany } from "@/lib/company-loader";
import { isDemoKey } from "@/lib/demo";
import { describeFilters } from "@/lib/export/criteria";
import { formatEuros } from "@/lib/format";
import { listMessages } from "@/lib/messages";
import { listNotes } from "@/lib/notes";
import { getProspect } from "@/lib/prospects";
import { parseSearchParams } from "@/lib/search-params";
import { getSequence } from "@/lib/sequence";
import { listTaches } from "@/lib/tasks";

export const metadata: Metadata = { title: "Fiche prospect" };

export default function ProspectPage({ params }: PageProps<"/prospects/[siren]">) {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: Pick<PageProps<"/prospects/[siren]">, "params">) {
  await connection();
  const { siren } = await params;
  const prospect = isProspectKey(siren) ? getProspect(siren) : null;
  if (!prospect) notFound();

  // Données publiques : seulement pour un vrai SIREN (ni prospect saisi à la main, ni démonstration)
  const hasPublic = /^\d{9}$/.test(siren) && !isDemoKey(siren);
  const lookup = hasPublic ? await loadCompany(siren) : null;
  const company = lookup?.status === "found" ? lookup.company : null;

  let origine = "";
  if (prospect.origine) {
    const parsed = parseSearchParams(new URLSearchParams(prospect.origine));
    origine = parsed.ok
      ? (await describeFilters(parsed.filters)).map(([, value]) => value).join(" · ") || "Tous les critères"
      : "Recherche Scoutly";
  }

  const messages = listMessages(siren);
  const notes = listNotes(siren);
  const taches = listTaches({ siren }).map((t) => ({ ...t, prospectNom: prospect.nom }));
  const dernier = messages[0];
  const sequence = getSequence();

  const secteur = company?.libelleNaf ?? prospect.secteur;
  const effectif = company?.trancheEffectif ?? prospect.effectif;
  const ville = company?.ville ?? prospect.ville;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/prospects" className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline">
        <ArrowLeft aria-hidden className="size-3.5" /> Retour à mes prospects
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={prospect.nom} className="size-11 text-sm" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{prospect.nom}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {[ville, secteur, effectif || "Effectif à préciser"].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPublic && (
            <Link
              href={`/entreprises/${siren}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
            >
              Fiche publique <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          )}
          <div className="w-44">
            <ProspectStatusSelect siren={siren} nom={prospect.nom} ville={prospect.ville} statut={prospect.statut} notes={prospect.notes} refresh />
          </div>
        </div>
      </header>

      {origine && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm">
          <Search aria-hidden className="size-4 shrink-0 text-indigo-700" />
          <div className="min-w-0 flex-1 text-slate-900">
            <strong>Recherche d&apos;origine</strong>
            <br />
            <span className="text-xs text-slate-500">{origine}</span>
          </div>
          <Link href={`/?${prospect.origine}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline">
            Revoir les critères <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm lg:grid-cols-4">
        {(
          [
            ["SIREN", hasPublic ? formatSiren(siren) : "À renseigner"],
            ["Activité / NAF", company?.codeNaf ?? (secteur || "À renseigner")],
            ["Effectif", effectif || "À renseigner"],
            ["Chiffre d'affaires", company?.chiffreAffaires != null ? formatEuros(company.chiffreAffaires, true) : "Non disponible"],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="mb-1 text-[11px] text-slate-500">{label}</dt>
            <dd className="text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Historique de la relation">
            <ProspectTimeline prospect={prospect} messages={messages} notes={notes} sequenceActive={sequence.active} />
            <NoteForm siren={siren} />
          </Panel>
          <Panel title="Actions" count={taches.filter((t) => !t.terminee).length}>
            <TaskList taches={taches} sansProspect emptyText="Aucune action pour ce prospect." />
            <TaskForm siren={siren} />
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          {dernier && (dernier.analyse || dernier.citation) && (
            <section className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                <Sparkles aria-hidden className="size-4" />
                Mémoire commerciale
              </div>
              {dernier.analyse && <p className="text-sm text-slate-900">{dernier.analyse}</p>}
              {dernier.citation && (
                <blockquote className="my-3 border-l-2 border-indigo-600 pl-3 text-xs text-slate-500">
                  {dernier.citation}
                  <small className="mt-0.5 block">Source : dernier email reçu</small>
                </blockquote>
              )}
              <Link
                href={`/messagerie?m=${dernier.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50"
              >
                Préparer la réponse →
              </Link>
            </section>
          )}

          <Panel title="Contact principal">
            <div className="flex flex-col gap-3 p-5 text-sm">
              <div>
                <strong className="text-slate-900">{prospect.contact || "Contact à renseigner"}</strong>
              </div>
              <div className="break-words text-xs text-slate-600">{prospect.email || "Email à renseigner"}</div>
              <div>
                <small className="block text-[11px] text-slate-500">Prochaine action</small>
                {prospect.prochaineAction || "—"}
              </div>
              {prospect.montant ? (
                <div>
                  <small className="block text-[11px] text-slate-500">
                    Opportunité{prospect.etape ? ` · ${prospect.etape}` : ""}
                  </small>
                  <strong className="text-slate-900">{formatEuros(prospect.montant)}</strong>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Suivi">
            <div className="p-5">
              <ProspectEditor siren={siren} nom={prospect.nom} ville={prospect.ville} initial={prospect} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
