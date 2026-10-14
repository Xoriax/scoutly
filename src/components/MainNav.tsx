"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Recherche", active: (p: string) => p === "/" || p.startsWith("/entreprises") },
  { href: "/recherches", label: "Recherches sauvegardées", active: (p: string) => p.startsWith("/recherches") },
  { href: "/prospects", label: "Prospects", active: (p: string) => p.startsWith("/prospects") },
];

/** Navigation avec la page active mise en évidence (lit l'URL : à placer dans un Suspense) */
export function MainNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Navigation sans page active : affichée pendant le pré-rendu */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto text-sm">
      {LINKS.map((link) => {
        const active = pathname !== null && link.active(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
