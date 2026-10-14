"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NouvelleEntreprise, SavedSearch } from "@/domain/prospect";
import { formatDate } from "@/lib/format";

interface Props {
  search: SavedSearch;
  /** Critères en clair */
  criteres: [string, string][];
  nouvelles: NouvelleEntreprise[];
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function SavedSearchCard({ search, criteres, nouvelles }: Props) {
  const router = useRouter();
  const [alerte, setAlerte] = useState(search.alerteActive);
  const [email, setEmail] = useState(search.alerteEmail ?? "");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState<"run" | "save" | "delete" | null>(null);

  async function saveAlert(nextAlerte: boolean) {
    setBusy("save");
    setMessage(null);
    const res = await fetch(`/api/saved-searches/${search.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alerteActive: nextAlerte, alerteEmail: email.trim() }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setMessage({ text: body?.error ?? "Enregistrement impossible.", error: true });
      return;
    }
    setAlerte(nextAlerte);
    setMessage({ text: nextAlerte ? "Alerte activée." : "Alerte désactivée." });
  }

  async function runNow() {
    setBusy("run");
    setMessage({ text: "Vérification en cours… (jusqu'à quelques minutes pour une recherche large)" });
    const res = await fetch(`/api/saved-searches/${search.id}/run`, { method: "POST" }).catch(() => null);
    setBusy(null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok || !body) {
      setMessage({ text: body?.error ?? "Vérification impossible.", error: true });
      return;
    }
    const count = (body.nouvelles as unknown[]).length;
    setMessage(
      body.error
        ? { text: body.error, error: true }
        : search.lastRunAt === null
          ? { text: "Première vérification : les résultats actuels servent de référence." }
          : { text: `${count} nouvelle${count > 1 ? "s" : ""} entreprise${count > 1 ? "s" : ""}.` },
    );
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Supprimer la recherche « ${search.nom} » ?`)) return;
    setBusy("delete");
    const res = await fetch(`/api/saved-searches/${search.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setMessage({ text: "Suppression impossible.", error: true });
      return;
    }
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{search.nom}</h2>
          <p className="text-xs text-slate-500">Enregistrée le {formatDateTime(search.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/?${search.query}`}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Lancer la recherche
          </Link>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 text-sm">
        {criteres.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">Alerte « nouvelles entreprises »</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Email du destinataire (facultatif)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse par défaut du serveur"
              className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5"
            />
          </label>
          <button
            type="button"
            onClick={() => saveAlert(!alerte)}
            disabled={busy !== null}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
              alerte
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {alerte ? "Désactiver l'alerte" : "Activer l'alerte"}
          </button>
          {alerte && (
            <button
              type="button"
              onClick={() => saveAlert(true)}
              disabled={busy !== null}
              className="text-sm text-indigo-700 hover:underline disabled:opacity-50"
            >
              Enregistrer l&apos;email
            </button>
          )}
          <button
            type="button"
            onClick={runNow}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {busy === "run" ? "Vérification…" : "Vérifier maintenant"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {alerte ? "Alerte active." : "Alerte inactive."}{" "}
          {search.lastRunAt
            ? `Dernière vérification le ${formatDateTime(search.lastRunAt)}${
                search.lastNewCount !== null ? ` : ${search.lastNewCount} nouvelle(s).` : "."
              }`
            : "Jamais vérifiée : la première vérification sert de référence."}
        </p>
        {search.lastError && (
          <p className="text-xs text-amber-800">Dernière vérification : {search.lastError}</p>
        )}
        {message && (
          <p role="status" className={`text-sm ${message.error ? "text-red-700" : "text-emerald-700"}`}>
            {message.text}
          </p>
        )}
      </section>

      {nouvelles.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Nouvelles entreprises détectées</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {nouvelles.map((n) => (
              <li key={n.siren} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span>
                  <Link href={`/entreprises/${n.siren}`} className="font-medium text-indigo-700 hover:underline">
                    {n.nom}
                  </Link>
                  {n.ville && <span className="text-slate-500"> · {n.ville}</span>}
                </span>
                <span className="text-xs text-slate-500">
                  Créée le {formatDate(n.dateCreation)} · détectée le {formatDate(n.detecteeLe.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
