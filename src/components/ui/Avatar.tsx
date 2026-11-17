import { initials } from "@/lib/format";

/** Pastille d'initiales (« Maison Rivage » → MR) */
export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[11px] font-semibold text-indigo-700 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
