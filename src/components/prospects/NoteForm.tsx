"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Ajout d'une note datée dans l'historique d'un prospect */
export function NoteForm({ siren }: { siren: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return setStatus({ text: "Saisissez une note avant de l'enregistrer.", error: true });
    setBusy(true);
    const res = await fetch(`/api/prospects/${siren}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corps: value }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setStatus({ text: "Enregistrement impossible.", error: true });
    setValue("");
    setStatus({ text: "Note ajoutée." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="border-t border-slate-200 p-5">
      <label htmlFor="note" className="mb-1.5 block text-xs font-medium text-slate-700">
        Ajouter une note
      </label>
      <textarea
        id="note"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus(null);
        }}
        rows={3}
        maxLength={5000}
        placeholder="Besoin, compte rendu, information utile…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          Enregistrer la note
        </button>
        <span role="status" className={`text-xs ${status?.error ? "text-red-700" : "text-slate-500"}`}>
          {status?.text}
        </span>
      </div>
    </form>
  );
}
