import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewProspectForm } from "@/components/prospects/NewProspectForm";

export const metadata: Metadata = { title: "Nouveau prospect" };

export default function NewProspectPage() {
  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/prospects" className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline">
        <ArrowLeft aria-hidden className="size-3.5" /> Retour à mes prospects
      </Link>
      <PageHeader title="Ajouter un prospect" description="Créez la fiche d'une entreprise que vous connaissez déjà." />
      <NewProspectForm />
    </main>
  );
}
