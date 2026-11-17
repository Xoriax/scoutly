import { ArrowRight, Mail, Search, Users } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: "search", href: "/", label: "1. Rechercher", icon: Search },
  { id: "prospects", href: "/prospects", label: "2. Suivre les prospects", icon: Users },
  { id: "inbox", href: "/messagerie", label: "3. Contacter & relancer", icon: Mail },
] as const;

/** Parcours de prospection, avec l'étape courante en évidence */
export function Journey({ active }: { active: (typeof STEPS)[number]["id"] }) {
  return (
    <nav aria-label="Parcours de prospection" className="mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {STEPS.map(({ id, href, label, icon: Icon }, i) => (
        <span key={id} className="flex items-center gap-3">
          {i > 0 && <ArrowRight aria-hidden className="size-3" />}
          <Link
            href={href}
            aria-current={id === active ? "step" : undefined}
            className={`flex items-center gap-1.5 ${id === active ? "font-semibold text-indigo-700" : "hover:text-slate-900"}`}
          >
            <Icon aria-hidden className="size-3.5" />
            {label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
