"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

interface Props {
  page: number;
  /** null si le nombre de pages est inconnu : navigation précédente / suivante uniquement */
  totalPages: number | null;
  hasNextPage: boolean;
  /** Construit l'URL d'une page donnée */
  hrefFor: (page: number) => string;
  onNavigate: (page: number) => void;
}

export function Pagination({ page, totalPages, hasNextPage, hrefFor, onNavigate }: Props) {
  const [target, setTarget] = useState(String(page));
  const hasPrev = page > 1;
  const hasNext = hasNextPage;

  function handleJump(event: FormEvent) {
    event.preventDefault();
    const n = Number(target);
    if (totalPages && Number.isInteger(n) && n >= 1 && n <= totalPages && n !== page) onNavigate(n);
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <PageLink href={hasPrev ? hrefFor(page - 1) : null}>← Précédente</PageLink>

      {totalPages === null ? (
        <span className="text-slate-600">Page {page}</span>
      ) : (
        <form onSubmit={handleJump} className="flex items-center gap-2 text-slate-600">
          <label htmlFor="page-jump">Page</label>
          <input
            id="page-jump"
            type="number"
            min={1}
            max={totalPages}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center"
          />
          <span>sur {totalPages}</span>
        </form>
      )}

      <PageLink href={hasNext ? hrefFor(page + 1) : null}>Suivante →</PageLink>
    </nav>
  );
}

function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  const className = "rounded-lg border px-4 py-2 font-medium";
  if (!href) {
    return (
      <span className={`${className} cursor-not-allowed border-slate-200 text-slate-400`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${className} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
    >
      {children}
    </Link>
  );
}
