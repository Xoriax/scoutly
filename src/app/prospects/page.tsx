import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { Journey } from "@/components/layout/Journey";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProspectBoard } from "@/components/prospects/ProspectBoard";
import { ProspectTable } from "@/components/prospects/ProspectTable";
import { ProspectToolbar, type ProspectView } from "@/components/prospects/ProspectToolbar";
import { isProspectStatut, PROSPECT_STATUTS, type ProspectStatut } from "@/domain/prospect";
import { listProspects } from "@/lib/prospects";

export const metadata: Metadata = { title: "Mes prospects" };

export default function ProspectsPage({ searchParams }: PageProps<"/prospects">) {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Journey active="prospects" />
      <PageHeader
        title="Votre portefeuille."
        description="Du premier contact à la conversation qui avance : statut, contact, opportunité et prochaine action."
        action={
          <Link
            href="/prospects/nouveau"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus aria-hidden className="size-4" /> Nouveau prospect
          </Link>
        }
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <ProspectsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function ProspectsContent({ searchParams }: Pick<PageProps<"/prospects">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const rawStatut = one(params.statut);
  const statut: ProspectStatut | null = isProspectStatut(rawStatut) ? rawStatut : null;
  const view: ProspectView = one(params.vue) === "liste" ? "liste" : "pipeline";
  const q = (one(params.q) ?? "").trim().slice(0, 100);

  const all = listProspects();
  const needle = q.toLowerCase();
  const matches = (haystack: (string | null)[]) => haystack.some((v) => v?.toLowerCase().includes(needle));
  const filtered = all.filter(
    (p) =>
      (!statut || p.statut === statut) &&
      (!needle || matches([p.nom, p.contact, p.ville, p.siren, p.prochaineAction, p.notes])),
  );
  const counts = Object.fromEntries(
    PROSPECT_STATUTS.map((s) => [s, all.filter((p) => p.statut === s).length]),
  ) as Record<ProspectStatut, number>;

  return (
    <div className="flex flex-col gap-4">
      <ProspectToolbar q={q} statut={statut} view={view} counts={counts} total={all.length} />

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          Aucun prospect suivi pour l&apos;instant. Attribuez un statut depuis la colonne « Suivi » des{" "}
          <Link href="/" className="font-medium text-indigo-700 underline">
            résultats de recherche
          </Link>{" "}
          ou depuis la fiche d&apos;une entreprise.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          Aucun prospect ne correspond.
        </p>
      ) : view === "liste" ? (
        <ProspectTable prospects={filtered} />
      ) : (
        <ProspectBoard prospects={filtered} />
      )}
      <p className="text-xs text-slate-500">
        {filtered.length} prospect{filtered.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
