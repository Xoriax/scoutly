import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { Company } from "@/domain/company";
import { ProviderError } from "@/domain/provider";
import { getProvider } from "@/providers";

export type CompanyLookup =
  | { status: "found"; company: Company }
  | { status: "not-found" }
  | { status: "error"; message: string };

/**
 * Fiche d'une entreprise pour les pages serveur.
 * cache() : le titre de la page et son contenu partagent le même appel dans une requête.
 */
export const loadCompany = cache(async (siren: string): Promise<CompanyLookup> => {
  // Données lues à la requête (cache mémoire, horloge) : jamais pendant le pré-rendu
  await connection();
  if (!/^\d{9}$/.test(siren)) return { status: "not-found" };
  try {
    const company = await getProvider().getBySiren(siren);
    return company ? { status: "found", company } : { status: "not-found" };
  } catch (error) {
    if (error instanceof ProviderError) return { status: "error", message: error.message };
    throw error;
  }
});
