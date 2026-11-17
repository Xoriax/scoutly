import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Message } from "@/domain/crm";

/** Mise en avant de l'échange non traité le plus récent, d'après son analyse */
export function AssistantPanel({ message, nom }: { message: Message; nom: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-indigo-50 p-4">
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-indigo-700">
        <Sparkles aria-hidden className="size-4" />Votre assistant a repéré
      </div>
      <p className="text-sm text-slate-900">
        <strong>{nom}</strong>
        <br />
        {message.analyse || message.objet}
      </p>
      <Link
        href={`/prospects/${message.siren}`}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50"
      >
        Voir le contexte <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}
