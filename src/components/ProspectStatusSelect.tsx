"use client";

import { useState } from "react";
import { PROSPECT_STATUTS, STATUT_LABELS, type ProspectStatut } from "@/domain/prospect";
import { STATUT_STYLES } from "./company-format";

interface Props {
  siren: string;
  nom: string;
  ville: string | null;
  statut: ProspectStatut | null;
  /** Notes existantes, conservées lors d'un changement de statut */
  notes?: string;
  onChange?: (statut: ProspectStatut | null) => void;
}

/** Changement rapide du statut de suivi, enregistré immédiatement */
export function ProspectStatusSelect({ siren, nom, ville, statut, notes, onChange }: Props) {
  const [value, setValue] = useState<ProspectStatut | null>(statut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function update(next: ProspectStatut | null) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(false);
    try {
      const res = next
        ? await fetch(`/api/prospects/${siren}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            // Les notes ne sont connues que sur la fiche : on les relit pour ne pas les écraser
            body: JSON.stringify({ nom, ville, statut: next, notes: notes ?? (await currentNotes(siren)) }),
          })
        : await fetch(`/api/prospects/${siren}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onChange?.(next);
    } catch {
      setValue(previous);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => update((e.target.value || null) as ProspectStatut | null)}
      disabled={saving}
      aria-label={`Suivi de ${nom}`}
      title={error ? "Enregistrement impossible, réessayez" : undefined}
      className={`w-full min-w-[8.5rem] rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60 ${
        error
          ? "border-red-300 bg-red-50 text-red-800"
          : value
            ? `border-transparent ring-1 ${STATUT_STYLES[value]}`
            : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <option value="">Non suivi</option>
      {PROSPECT_STATUTS.map((s) => (
        <option key={s} value={s}>
          {STATUT_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

async function currentNotes(siren: string): Promise<string> {
  const res = await fetch(`/api/prospects/${siren}`);
  if (!res.ok) return "";
  const body = (await res.json()) as { notes?: string };
  return body.notes ?? "";
}
