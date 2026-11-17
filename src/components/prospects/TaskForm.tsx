"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

/** Ajout d'une action à faire pour un prospect */
export function TaskForm({ siren }: { siren: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/taches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siren,
        titre: data.get("titre"),
        raison: data.get("raison"),
        echeance: data.get("echeance"),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Ajout impossible : le titre est obligatoire.");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-slate-200 p-5">
      <input name="titre" required maxLength={300} placeholder="Nouvelle action (ex. Rappeler vendredi)" aria-label="Titre de l'action" className={INPUT} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="raison" maxLength={300} placeholder="Pourquoi ? (facultatif)" aria-label="Raison" className={INPUT} />
        <input name="echeance" maxLength={60} placeholder="Échéance (ex. Avant 12:00)" aria-label="Échéance" className={INPUT} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" /> Ajouter l&apos;action
        </button>
        {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  );
}
