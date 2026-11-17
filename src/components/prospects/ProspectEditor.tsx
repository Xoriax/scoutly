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

interface Form {
  statut: ProspectStatut | "";
  contact: string;
  email: string;
  /** Saisi en texte, converti en entier à l'envoi */
  montant: string;
  prochaineAction: string;
  etape: string;
  notes: string;
}

const toForm = (p: Prospect | null): Form => ({
  statut: p?.statut ?? "",
  contact: p?.contact ?? "",
  email: p?.email ?? "",
  montant: p?.montant != null ? String(p.montant) : "",
  prochaineAction: p?.prochaineAction ?? "",
  etape: p?.etape ?? "",
  notes: p?.notes ?? "",
});

const INPUT = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50";

/** Suivi d'une entreprise sur sa fiche : statut, contact, opportunité, prochaine action et notes */
export function ProspectEditor({ siren, nom, ville, initial }: Props) {
  const [form, setForm] = useState<Form>(toForm(initial));
  const [saved, setSaved] = useState<Prospect | null>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));
  const tracked = form.statut !== "";

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      if (!form.statut) {
        const res = await fetch(`/api/prospects/${siren}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setSaved(null);
        setForm(toForm(null));
      } else {
        const montant = form.montant.trim() === "" ? null : Number(form.montant);
        if (montant !== null && (!Number.isInteger(montant) || montant < 0)) throw new Error();
        const res = await fetch(`/api/prospects/${siren}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom,
            ville,
            statut: form.statut,
            notes: form.notes,
            contact: form.contact,
            email: form.email.trim(),
            montant,
            prochaineAction: form.prochaineAction,
            etape: form.etape,
          }),
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
          value={form.statut}
          onChange={(e) => set("statut", e.target.value as ProspectStatut | "")}
          className={INPUT}
        >
          <option value="">Non suivi</option>
          {PROSPECT_STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Contact</span>
          <input
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
            disabled={!tracked}
            maxLength={200}
            placeholder="Prénom et nom"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            disabled={!tracked}
            maxLength={200}
            placeholder="contact@entreprise.fr"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Opportunité (€)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={form.montant}
            onChange={(e) => set("montant", e.target.value)}
            disabled={!tracked}
            placeholder="Montant estimé"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Étape de l&apos;opportunité</span>
          <input
            value={form.etape}
            onChange={(e) => set("etape", e.target.value)}
            disabled={!tracked}
            maxLength={100}
            placeholder="Proposition envoyée, négociation…"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Prochaine action</span>
          <input
            value={form.prochaineAction}
            onChange={(e) => set("prochaineAction", e.target.value)}
            disabled={!tracked}
            maxLength={300}
            placeholder="Envoyer le devis, rappeler vendredi…"
            className={INPUT}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          disabled={!tracked}
          rows={4}
          maxLength={5000}
          placeholder={tracked ? "Besoin identifié, compte rendu, information utile…" : "Choisissez d'abord un statut."}
          className={INPUT}
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
