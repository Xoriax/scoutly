import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** « warning » : sous-texte en ambre (action attendue) */
  hintTone?: "default" | "warning";
  icon: LucideIcon;
}

/** Indicateur clé du tableau de bord */
export function MetricCard({ label, value, hint, hintTone = "default", icon: Icon }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        {label}
        <Icon aria-hidden className="size-4" />
      </div>
      <div className="mt-2 text-3xl font-medium tabular-nums tracking-tight text-slate-900">{value}</div>
      {hint && <p className={`mt-0.5 text-xs ${hintTone === "warning" ? "text-amber-800" : "text-slate-500"}`}>{hint}</p>}
    </div>
  );
}
