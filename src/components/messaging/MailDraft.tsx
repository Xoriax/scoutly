"use client";

import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Message } from "@/domain/crm";

/** Analyse de l'échange, brouillon de réponse modifiable, validation et marquage « traité » */
export function MailDraft({ message }: { message: Message }) {
  const router = useRouter();
  const [draft, setDraft] = useState(message.brouillon);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(body: { brouillon?: string; traite?: boolean }, ok: string) {
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setStatus({ text: "Enregistrement impossible.", error: true });
    setStatus({ text: ok });
    router.refresh();
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-5">
      {(message.analyse || message.citation) && (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <Sparkles aria-hidden className="size-4" />
            Analyse de l&apos;échange
          </div>
          {message.analyse && <p className="text-sm text-slate-900">{message.analyse}</p>}
          {message.citation && (
            <blockquote className="my-3 border-l-2 border-indigo-600 pl-3 text-xs text-slate-500">
              {message.citation}
              <small className="mt-0.5 block">Source : email ci-dessus · à confirmer par vous</small>
            </blockquote>
          )}
        </>
      )}
      <label htmlFor="brouillon" className="mb-1.5 block text-xs font-medium text-slate-700">
        Brouillon de réponse · modifiable
      </label>
      <textarea
        id="brouillon"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setStatus(null);
        }}
        rows={8}
        maxLength={20000}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || draft === message.brouillon}
          onClick={() => patch({ brouillon: draft }, "Brouillon validé. Aucun email n'a été envoyé.")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Check aria-hidden className="size-4" /> Valider le brouillon
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            patch({ traite: !message.traite }, message.traite ? "Échange rouvert." : "Échange marqué comme traité.")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
        >
          {message.traite ? "Marqué comme traité" : "Marquer comme traité"}
        </button>
        <span role="status" className={`text-xs ${status?.error ? "text-red-700" : "text-slate-500"}`}>
          {status?.text}
        </span>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Simulation uniquement · aucune connexion ni aucun envoi réel.</p>
    </div>
  );
}
