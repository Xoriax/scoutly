"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Status = { state: "closed" } | { state: "open" } | { state: "saving" } | { state: "saved" } | { state: "error"; message: string };

/** Enregistre la recherche en cours sous un nom, pour la relancer ou la surveiller */
export function SaveSearchButton({ query, suggestion }: { query: string; suggestion: string }) {
  const [status, setStatus] = useState<Status>({ state: "closed" });
  const [nom, setNom] = useState(suggestion);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus({ state: "saving" });
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ state: "error", message: body.error ?? `Erreur ${res.status}` });
        return;
      }
      setStatus({ state: "saved" });
    } catch {
      setStatus({ state: "error", message: "Impossible de joindre le serveur." });
    }
  }

  if (status.state === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStatus({ state: "open" })}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ☆ Enregistrer la recherche
      </button>
    );
  }

  if (status.state === "saved") {
    return (
      <p role="status" className="text-sm text-emerald-700">
        Recherche enregistrée.{" "}
        <Link href="/recherches" className="font-medium underline">
          Voir mes recherches
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <label htmlFor="save-search-name" className="sr-only">
        Nom de la recherche
      </label>
      <input
        id="save-search-name"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        maxLength={120}
        autoFocus
        placeholder="Nom de la recherche"
        className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <button
        type="submit"
        disabled={status.state === "saving" || !nom.trim()}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        Enregistrer
      </button>
      <button
        type="button"
        onClick={() => setStatus({ state: "closed" })}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Annuler
      </button>
      {status.state === "error" && (
        <span role="alert" className="text-sm text-red-700">
          {status.message}
        </span>
      )}
    </form>
  );
}
