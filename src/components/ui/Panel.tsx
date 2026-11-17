import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Compteur à côté du titre */
  count?: number;
  /** Élément à droite de l'en-tête (lien, bouton, icône) */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Bloc blanc à bordure fine : brique commune des pages */
export function Panel({ title, subtitle, count, action, className = "", children }: Props) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              {title}
              {count !== undefined && (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                  {count}
                </span>
              )}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Message de panneau vide */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-500">{children}</p>;
}
