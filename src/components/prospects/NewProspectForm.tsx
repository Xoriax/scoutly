"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

/** Création d'un prospect saisi à la main (sans passer par la recherche) */
export function NewProspectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: data.get("nom"),
        contact: data.get("contact"),
        ville: data.get("ville"),
        email: data.get("email"),
        secteur: data.get("secteur"),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      return setError(body?.error ?? "Création impossible.");
    }
    const created = (await res.json()) as { siren: string };
    router.push(`/prospects/${created.siren}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Entreprise
        <input name="nom" required maxLength={300} placeholder="Nom de l'entreprise" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Contact
        <input name="contact" maxLength={200} placeholder="Prénom et nom" className={INPUT} />
      </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Ville
          <input name="ville" maxLength={200} placeholder="Ville" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Secteur
          <input name="secteur" maxLength={200} placeholder="Hôtellerie, conseil…" className={INPUT} />
        </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email professionnel
        <input name="email" type="email" maxLength={200} placeholder="contact@entreprise.fr" className={INPUT} />
      </label>
      {error && <p role="alert" className="text-xs text-red-700 md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Créer la fiche
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Pour une entreprise déjà identifiée, passez plutôt par la recherche : ses données publiques sont reprises.
        </p>
      </div>
    </form>
  );
}
