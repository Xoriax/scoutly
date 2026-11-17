"use client";

import { RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NouvelleEntreprise, SavedSearch } from "@/domain/prospect";
import { Badge } from "@/components/ui/Badge";
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
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{search.nom}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Enregistrée le {formatDateTime(search.createdAt)}</p>
        </div>
        {alerte && <Badge tone="positive">Recherche surveillée</Badge>}
      </header>

      <p className="text-xs text-slate-500">
        {criteres.map(([label, value]) => `${label} : ${value}`).join(" · ")}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/?${search.query}`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Search aria-hidden className="size-4" /> Relancer la recherche
        </Link>
        <button
          type="button"
          onClick={runNow}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw aria-hidden className={`size-4 ${busy === "run" ? "animate-spin" : ""}`} />
          {busy === "run" ? "Vérification…" : "Vérifier les nouveautés"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 aria-hidden className="size-4" /> Supprimer
        </button>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-slate-900">
        <input
          type="checkbox"
          checked={alerte}
          disabled={busy !== null}
          onChange={() => saveAlert(!alerte)}
          className="mt-1 size-4 accent-indigo-600"
        />
        <span>
          Alerte nouvelles entreprises
          <small className="block text-[11px] text-slate-500">
            Détecte les entreprises jamais vues dans cette recherche.
          </small>
        </span>
      </label>

      {alerte && (
        <div className="flex flex-wrap items-end gap-3 pl-6">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Email du destinataire (facultatif)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse par défaut du serveur"
              className="w-72 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={() => saveAlert(true)}
            disabled={busy !== null}
            className="pb-2 text-xs font-medium text-indigo-700 hover:underline disabled:opacity-50"
          >
            Enregistrer l&apos;email
          </button>
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        <p>
          {search.lastRunAt
            ? `Dernière vérification le ${formatDateTime(search.lastRunAt)}${
                search.lastNewCount !== null ? ` : ${search.lastNewCount} nouvelle(s).` : "."
              }`
            : "Jamais vérifiée : la première vérification sert de référence."}
        </p>
        {search.lastError && <p className="mt-1 text-amber-800">Dernière vérification : {search.lastError}</p>}
        {message && (
          <p role="status" className={`mt-1 text-sm ${message.error ? "text-red-700" : "text-indigo-700"}`}>
            {message.text}
          </p>
        )}
      </div>

      {nouvelles.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg bg-indigo-50 p-4">
          <h3 className="text-xs font-semibold text-indigo-700">
            {nouvelles.length} nouvelle{nouvelles.length > 1 ? "s" : ""} entreprise{nouvelles.length > 1 ? "s" : ""} détectée
            {nouvelles.length > 1 ? "s" : ""}
          </h3>
          <ul className="divide-y divide-indigo-100 text-sm">
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
