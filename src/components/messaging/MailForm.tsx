"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/ui/Panel";

interface Props {
  prospects: { siren: string; nom: string }[];
}

const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

/** Consigne un échange reçu (aucune boîte mail n'est connectée : saisie manuelle) */
export function MailForm({ prospects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siren: form.get("siren"),
        objet: form.get("objet"),
        etiquette: form.get("etiquette"),
        corps: form.get("corps"),
        analyse: form.get("analyse"),
        brouillon: form.get("brouillon"),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      return setError(body?.error ?? "Enregistrement impossible.");
    }
    const created = (await res.json()) as { id: number };
    setOpen(false);
    router.push(`/messagerie?m=${created.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={prospects.length === 0}
        title={prospects.length === 0 ? "Ajoutez d'abord un prospect" : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        <Plus aria-hidden className="size-4" /> Nouvel échange
      </button>
    );
  }

  return (
    <Panel title="Nouvel échange" subtitle="Consignez un email reçu d'un de vos prospects.">
      <form onSubmit={submit} className="flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Prospect
          <select name="siren" required className={INPUT}>
            {prospects.map((p) => (
              <option key={p.siren} value={p.siren}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Objet
          <input name="objet" required maxLength={300} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Étiquette <span className="font-normal text-slate-500">(facultatif)</span>
          <input name="etiquette" maxLength={60} placeholder="Devis demandé, rendez-vous confirmé…" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Message reçu
          <textarea name="corps" required rows={6} maxLength={20000} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Point d&apos;attention <span className="font-normal text-slate-500">(facultatif)</span>
          <input name="analyse" maxLength={2000} placeholder="Ce qu'il faut retenir de l'échange" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Brouillon de réponse <span className="font-normal text-slate-500">(facultatif)</span>
          <textarea name="brouillon" rows={4} maxLength={20000} className={INPUT} />
        </label>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Enregistrer l&apos;échange
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </Panel>
  );
}
