import { Search } from "lucide-react";
import Link from "next/link";

/** Rappel : la prospection commence par une recherche */
export function SearchResume() {
  return (
    <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3.5 text-sm">
      <div>
        <strong className="text-slate-900">Votre prospection commence par une recherche.</strong>
        <small className="mt-0.5 block text-xs text-slate-500">
          NAF, localisation, effectif → entreprises ciblées → suivi commercial
        </small>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <Search aria-hidden className="size-4" /> Rechercher
      </Link>
    </section>
  );
}
