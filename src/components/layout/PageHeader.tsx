import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: ReactNode;
  /** Bouton ou lien d'action, aligné à droite */
  action?: ReactNode;
}

/** En-tête de page commun : étiquette, titre, sous-titre et action */
export function PageHeader({ title, description, action }: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
          Scoutly · Trouver, qualifier, contacter
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}
