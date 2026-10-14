import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page introuvable</h1>
      <p className="text-sm text-slate-600">
        Cette page ou cette entreprise n&apos;existe pas, ou ses informations ne sont pas
        diffusables.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Retour à la recherche
      </Link>
    </main>
  );
}
