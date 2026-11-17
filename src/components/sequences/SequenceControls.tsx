"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SEND_MODES, type SequenceSettings } from "@/domain/crm";
import { Badge } from "@/components/ui/Badge";

async function save(changes: Partial<SequenceSettings>): Promise<boolean> {
  const res = await fetch("/api/sequence", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Bouton activer / mettre en pause et pastilles d'état (simulation) */
export function SequenceToggle({ settings }: { settings: SequenceSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    setBusy(true);
    setError(false);
    const ok = await save({ active: !settings.active });
    setBusy(false);
    if (!ok) return setError(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
          settings.active
            ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {settings.active ? "Mettre en pause" : "Activer"}
      </button>
      {error && <span role="alert" className="text-[11px] text-red-700">Enregistrement impossible.</span>}
    </div>
  );
}

export function SequenceBadges({ settings }: { settings: SequenceSettings }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={settings.active ? "positive" : "neutral"}>{settings.active ? "Active · simulation" : "En pause"}</Badge>
      <Badge>{settings.mode}</Badge>
    </div>
  );
}

/** Règles de la séquence et mode d'envoi */
export function SequenceRules({ settings }: { settings: SequenceSettings }) {
  const router = useRouter();
  const [error, setError] = useState(false);

  async function change(changes: Partial<SequenceSettings>) {
    setError(false);
    const ok = await save(changes);
    if (!ok) return setError(true);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-indigo-700">
        <ShieldCheck aria-hidden className="size-4" />
        Règles de la séquence
      </div>
      <div className="flex flex-col gap-3 text-sm text-slate-900">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" checked disabled className="mt-1 size-4 accent-indigo-600" />
          <span>
            Arrêter dès qu&apos;une réponse est reçue
            <small className="block text-[11px] text-slate-500">Règle obligatoire dans cette proposition</small>
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.absences}
            onChange={(e) => change({ absences: e.target.checked })}
            className="mt-1 size-4 accent-indigo-600"
          />
          <span>
            Suspendre pendant une absence
            <small className="block text-[11px] text-slate-500">Reprise après la date de retour détectée</small>
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" checked disabled className="mt-1 size-4 accent-indigo-600" />
          <span>Exclure les contacts désinscrits</span>
        </label>
        <div>
          <label htmlFor="mode" className="mb-1.5 block text-xs font-medium text-slate-700">
            Mode d&apos;envoi
          </label>
          <select
            id="mode"
            value={settings.mode}
            onChange={(e) => change({ mode: e.target.value as SequenceSettings["mode"] })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {SEND_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] text-red-700">Enregistrement impossible.</p>}
    </section>
  );
}
