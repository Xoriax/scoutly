import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProspectStatusSelect } from "@/components/ProspectStatusSelect";
import {
  isProspectStatut,
  PROSPECT_STATUTS,
  STATUT_LABELS,
  type ProspectStatut,
} from "@/domain/prospect";
import { listProspects } from "@/lib/prospects";

export const metadata: Metadata = { title: "Prospects suivis" };

export default function ProspectsPage({ searchParams }: PageProps<"/prospects">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Prospects suivis</h1>
        <p className="mt-1 text-sm text-slate-600">
          Entreprises auxquelles vous avez attribué un statut, depuis la recherche ou leur fiche.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <ProspectsList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProspectsList({ searchParams }: Pick<PageProps<"/prospects">, "searchParams">) {
  await connection();
  const { statut: raw } = await searchParams;
  const statut: ProspectStatut | null = isProspectStatut(raw) ? raw : null;

  const all = listProspects();
  const prospects = statut ? all.filter((p) => p.statut === statut) : all;
  const counts = Object.fromEntries(
    PROSPECT_STATUTS.map((s) => [s, all.filter((p) => p.statut === s).length]),
  ) as Record<ProspectStatut, number>;

  const tab = (value: ProspectStatut | null, label: string, count: number) => (
    <Link
      key={value ?? "tous"}
      href={value ? `/prospects?statut=${value}` : "/prospects"}
      aria-current={statut === value ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        statut === value ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {tab(null, "Tous", all.length)}
        {PROSPECT_STATUTS.map((s) => tab(s, STATUT_LABELS[s], counts[s]))}
      </nav>

      {prospects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          {all.length === 0 ? (
            <>
              Aucun prospect suivi pour l&apos;instant. Attribuez un statut depuis la colonne
              « Suivi » des <Link href="/" className="font-medium text-indigo-700 underline">résultats de recherche</Link> ou
              depuis la fiche d&apos;une entreprise.
            </>
          ) : (
            "Aucun prospect avec ce statut."
          )}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Entreprise</th>
                <th scope="col" className="px-4 py-3">Ville</th>
                <th scope="col" className="px-4 py-3">Statut</th>
                <th scope="col" className="px-4 py-3">Notes</th>
                <th scope="col" className="px-4 py-3">Modifié le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {prospects.map((p) => (
                <tr key={p.siren} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/entreprises/${p.siren}`} className="font-medium text-indigo-700 hover:underline">
                      {p.nom}
                    </Link>
                    <div className="font-mono text-xs text-slate-500">{p.siren}</div>
                  </td>
                  <td className="px-4 py-3">{p.ville ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ProspectStatusSelect
                      siren={p.siren}
                      nom={p.nom}
                      ville={p.ville}
                      statut={p.statut}
                      notes={p.notes}
                    />
                  </td>
                  <td className="max-w-md whitespace-pre-line px-4 py-3 text-slate-600">
                    {p.notes ? (p.notes.length > 200 ? `${p.notes.slice(0, 200)}…` : p.notes) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
