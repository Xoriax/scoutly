"use client";

import { useState, type FormEvent } from "react";
import {
  PROSPECT_STATUTS,
  STATUT_LABELS,
  type Prospect,
  type ProspectStatut,
} from "@/domain/prospect";

interface Props {
  siren: string;
  nom: string;
  ville: string | null;
  initial: Prospect | null;
}

/** Suivi d'une entreprise sur sa fiche : statut et notes */
export function ProspectEditor({ siren, nom, ville, initial }: Props) {
  const [statut, setStatut] = useState<ProspectStatut | "">(initial?.statut ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saved, setSaved] = useState<Prospect | null>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = statut !== (saved?.statut ?? "") || notes !== (saved?.notes ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      if (!statut) {
        const res = await fetch(`/api/prospects/${siren}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setSaved(null);
        setNotes("");
      } else {
        const res = await fetch(`/api/prospects/${siren}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, ville, statut, notes }),
        });
        if (!res.ok) throw new Error();
        setSaved((await res.json()) as Prospect);
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Statut</span>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as ProspectStatut | "");
            setStatus("idle");
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Non suivi</option>
          {PROSPECT_STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setStatus("idle");
          }}
          disabled={!statut}
          rows={4}
          maxLength={5000}
          placeholder={statut ? "Interlocuteur, date de relance, besoin identifié…" : "Choisissez d'abord un statut."}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || status === "saving"}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Enregistrer
        </button>
        <span role="status" className="text-xs text-slate-500">
          {status === "saving" && "Enregistrement…"}
          {status === "saved" && (saved ? "Suivi enregistré." : "Suivi retiré.")}
          {status === "error" && <span className="text-red-700">Enregistrement impossible.</span>}
          {status === "idle" && saved && `Modifié le ${new Date(saved.updatedAt).toLocaleDateString("fr-FR")}`}
        </span>
      </div>
    </form>
  );
}
