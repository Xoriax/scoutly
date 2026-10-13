import "server-only";
import type { CompanyProvider } from "@/domain/provider";
import { PappersProvider } from "./pappers/provider";
import { RechercheEntreprisesProvider } from "./recherche-entreprises/provider";

/**
 * Registre des providers disponibles.
 * Pour en ajouter un : implémenter CompanyProvider et l'enregistrer ici.
 */
const PROVIDERS: Record<string, () => CompanyProvider> = {
  "recherche-entreprises": () => new RechercheEntreprisesProvider(),
  pappers: () => new PappersProvider(),
};

const DEFAULT_PROVIDER = "recherche-entreprises";

let instance: CompanyProvider | undefined;

/** Provider actif, choisi par la variable d'environnement COMPANY_PROVIDER */
export function getProvider(): CompanyProvider {
  if (instance) return instance;
  const name = process.env.COMPANY_PROVIDER?.trim() || DEFAULT_PROVIDER;
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(
      `COMPANY_PROVIDER="${name}" inconnu. Valeurs possibles : ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  instance = factory();
  return instance;
}
