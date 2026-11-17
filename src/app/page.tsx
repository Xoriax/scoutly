import { Suspense } from "react";
import { Journey } from "@/components/layout/Journey";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchApp } from "@/components/search/SearchApp";
import { exportMaxRows } from "@/lib/export/collect";

export default function Home() {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Recherche d'entreprises françaises."
        description="Identifiez vos cibles avec les données publiques, puis organisez votre prospection."
      />
      <Journey active="search" />
      {/* useSearchParams impose une frontière Suspense */}
      <Suspense fallback={null}>
        <SearchApp exportMaxRows={exportMaxRows()} />
      </Suspense>
    </main>
  );
}
