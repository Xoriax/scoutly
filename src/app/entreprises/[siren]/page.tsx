import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompanyDetail } from "@/components/CompanyDetail";
import { loadCompany } from "@/lib/company-loader";
import { getProspect } from "@/lib/prospects";

export async function generateMetadata({
  params,
}: PageProps<"/entreprises/[siren]">): Promise<Metadata> {
  const { siren } = await params;
  const lookup = await loadCompany(siren);
  return { title: lookup.status === "found" ? lookup.company.nom : "Entreprise" };
}

export default function CompanyPage({ params, searchParams }: PageProps<"/entreprises/[siren]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Le SIREN n'est connu qu'à la requête : contenu chargé dans une frontière Suspense */}
      <Suspense fallback={<DetailSkeleton />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/entreprises/[siren]">, "params" | "searchParams">) {
  const [{ siren }, query] = await Promise.all([params, searchParams]);
  const retour = typeof query.retour === "string" ? query.retour : "";
  // Toujours un chemin interne : "/?<paramètres de recherche>"
  const backHref = retour ? `/?${new URLSearchParams(retour)}` : "/";

  const lookup = await loadCompany(siren);
  if (lookup.status === "not-found") notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={backHref} className="text-sm font-medium text-indigo-700 hover:underline">
        ← Retour aux résultats
      </Link>
      {lookup.status === "error" ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Impossible de charger cette entreprise : {lookup.message}
        </div>
      ) : (
        <CompanyDetail company={lookup.company} prospect={getProspect(siren)} />
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="flex animate-pulse flex-col gap-6">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
