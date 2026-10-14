import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SavedSearchCard } from "@/components/SavedSearchCard";
import { describeFilters } from "@/lib/export/criteria";
import { isMailConfigured } from "@/lib/mailer";
import { listNouvelles, listSavedSearches } from "@/lib/saved-searches";
import { parseSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Recherches sauvegardées" };

export default function SavedSearchesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recherches sauvegardées</h1>
        <p className="mt-1 text-sm text-slate-600">
          Relancez vos recherches en un clic et soyez prévenu des nouvelles entreprises qui y
          apparaissent.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
        <SavedSearchesList />
      </Suspense>
    </main>
  );
}

async function SavedSearchesList() {
  await connection();
  const searches = listSavedSearches();

  if (searches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        Aucune recherche sauvegardée. Lancez une{" "}
        <Link href="/" className="font-medium text-indigo-700 underline">
          recherche
        </Link>{" "}
        puis cliquez sur « Enregistrer la recherche ».
      </p>
    );
  }

  const cards = await Promise.all(
    searches.map(async (search) => {
      const parsed = parseSearchParams(new URLSearchParams(search.query));
      const criteres = parsed.ok ? await describeFilters(parsed.filters) : [];
      if (parsed.ok && parsed.options.masquerSuivis) {
        criteres.push(["Entreprises déjà suivies", "Masquées"]);
      }
      return { search, criteres, nouvelles: listNouvelles(search.id, 20) };
    }),
  );

  const scheduled = Boolean(process.env.ALERT_CRON_TOKEN);
  const mail = isMailConfigured();

  return (
    <div className="flex flex-col gap-4">
      {(!scheduled || !mail) && (
        <div role="status" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <strong>Alertes automatiques :</strong>{" "}
          {!scheduled && "la vérification planifiée n'est pas configurée (ALERT_CRON_TOKEN). "}
          {!mail && "l'envoi d'emails n'est pas configuré (SMTP_HOST, SMTP_FROM). "}
          Vous pouvez toujours vérifier une recherche avec « Vérifier maintenant » ; les nouveautés
          s&apos;affichent ici.
        </div>
      )}
      {cards.map(({ search, criteres, nouvelles }) => (
        <SavedSearchCard key={search.id} search={search} criteres={criteres} nouvelles={nouvelles} />
      ))}
    </div>
  );
}
