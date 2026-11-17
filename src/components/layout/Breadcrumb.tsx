"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./Sidebar";

/** Fil d'Ariane de l'espace de travail : nom de la section courante */
export function Breadcrumb() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => item.active(pathname))?.label ?? "Scoutly";
  return (
    <div className="hidden border-b border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 md:block">
      Espace de travail <span className="mx-1.5">/</span>
      <strong className="font-medium text-slate-900">{current}</strong>
    </div>
  );
}
