import { Suspense } from "react";
import { SearchApp } from "@/components/SearchApp";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Prospection d&apos;entreprises
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Recherchez des entreprises françaises par secteur, zone, taille et date de création.
        </p>
      </header>
      {/* useSearchParams impose une frontière Suspense */}
      <Suspense fallback={null}>
        <SearchApp />
      </Suspense>
    </main>
  );
}
