import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-slate-100 text-slate-500",
  positive: "bg-indigo-50 text-indigo-700",
  warning: "bg-amber-50 text-amber-800",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] ${TONES[tone]}`}>
      {children}
    </span>
  );
}
