import { PROSPECT_STATUTS, STATUT_LABELS, type Prospect } from "@/domain/prospect";
import { ProspectCard } from "./ProspectCard";

/** Pipeline : une colonne par statut (défilement horizontal sur grand écran) */
export function ProspectBoard({ prospects }: { prospects: Prospect[] }) {
  return (
    <div className="grid gap-4 md:flex md:overflow-x-auto md:pb-3">
      {PROSPECT_STATUTS.map((statut) => {
        const lane = prospects.filter((p) => p.statut === statut);
        return (
          <section
            key={statut}
            aria-label={STATUT_LABELS[statut]}
            className="flex flex-col gap-3 rounded-xl bg-slate-100/70 p-3 md:w-72 md:shrink-0"
          >
            <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {STATUT_LABELS[statut]}
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{lane.length}</span>
            </h2>
            {lane.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                Aucun prospect
              </p>
            ) : (
              lane.map((p) => <ProspectCard key={p.siren} prospect={p} />)
            )}
          </section>
        );
      })}
    </div>
  );
}
