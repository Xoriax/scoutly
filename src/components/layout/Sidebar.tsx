"use client";

import {
  BarChart3,
  Bookmark,
  Building2,
  Mail,
  Search,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavCounts {
  prospects: number;
  messages: number;
}

interface NavItem {
  href: string;
  label: string;
  /** Libellé court, utilisé dans le menu mobile */
  short: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
  count?: (counts: NavCounts) => number;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Rechercher", short: "Rechercher", icon: Search, active: (p) => p === "/" || p.startsWith("/entreprises") },
  { href: "/recherches", label: "Recherches & alertes", short: "Alertes", icon: Bookmark, active: (p) => p.startsWith("/recherches") },
  { href: "/prospects", label: "Mes prospects", short: "Prospects", icon: Users, active: (p) => p.startsWith("/prospects"), count: (c) => c.prospects },
  { href: "/tableau-de-bord", label: "Tableau de bord", short: "Pilotage", icon: BarChart3, active: (p) => p.startsWith("/tableau-de-bord") },
  { href: "/messagerie", label: "Messagerie", short: "Messages", icon: Mail, active: (p) => p.startsWith("/messagerie"), count: (c) => c.messages },
  { href: "/sequences", label: "Séquences", short: "Séquences", icon: Workflow, active: (p) => p.startsWith("/sequences") },
];

/** Barre latérale (menu en grille sur mobile) ; lit l'URL, donc à placer dans un Suspense */
export function Sidebar({ counts }: { counts: NavCounts }) {
  return <SidebarView pathname={usePathname()} counts={counts} />;
}

/** Version sans page active ni compteurs, affichée pendant le pré-rendu */
export function SidebarView({ pathname, counts }: { pathname: string | null; counts: NavCounts | null }) {
  return (
    <aside className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2 md:sticky md:top-0 md:h-screen md:w-60 md:gap-5 md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-6">
      <Link href="/" aria-label="Scoutly – accueil" className="rounded-md px-2">
        {/* SVG local : servi tel quel par next/image, sans optimisation */}
        <Image src="/scoutly-logo.svg" alt="Scoutly" width={140} height={32} priority className="dark:hidden" />
        {/* Variante au texte clair pour le thème sombre */}
        <Image src="/scoutly-logo-dark.svg" alt="" width={140} height={32} priority className="hidden dark:block" />
      </Link>

      <div className="hidden items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs md:flex">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
          <Building2 aria-hidden className="size-4" />
        </span>
        <div>
          Prospection d&apos;entreprises
          <small className="mt-0.5 block text-[11px] text-slate-500">Données publiques françaises</small>
        </div>
      </div>

      <nav aria-label="Navigation principale" className="grid grid-cols-3 gap-1 sm:grid-cols-6 md:flex md:flex-col">
        <p className="mb-1 hidden px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 md:block">
          Rechercher & suivre
        </p>
        {NAV_ITEMS.map(({ href, label, short, icon: Icon, active: isActive, count }) => {
          const active = pathname !== null && isActive(pathname);
          const n = counts && count ? count(counts) : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium md:flex-row md:gap-2.5 md:px-3 md:text-sm ${
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="md:hidden">{short}</span>
              <span className="hidden md:inline">{label}</span>
              {n > 0 && (
                <span className="absolute right-2 top-1 rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-700 md:static md:ml-auto md:py-px">
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-slate-200 pt-4 text-[11px] text-slate-500 md:block">
        <p className="flex items-start gap-2">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>
            Messagerie en simulation
            <small className="mt-0.5 block text-[10px]">Aucune boîte mail connectée, aucun envoi réel</small>
          </span>
        </p>
      </div>
    </aside>
  );
}
