import type { Company, Dirigeant, Etablissement } from "@/domain/company";
import {
  libelleNaf,
  libelleNatureJuridique,
  libelleTrancheEffectif,
} from "@/data/referentiels/labels";
import type { ApiEtablissement, ApiResult } from "./api-types";

export const SOURCE_NAME = "recherche-entreprises";

/**
 * Les entrepreneurs ayant demandé la non-diffusion de leur adresse ont des champs
 * remplacés par ce texte : on les traite comme absents.
 */
const NON_DIFFUSIBLE = "[NON-DIFFUSIBLE]";
const diffusible = (value: string | null | undefined) =>
  value && value !== NON_DIFFUSIBLE ? value : null;

/**
 * L'API renvoie parfois des entrées fantômes (connues du RNE mais sans aucune donnée INSEE :
 * ni nom, ni siège). On les traite comme inexistantes.
 */
export function isUsableResult(result: ApiResult): boolean {
  return Boolean(result.nom_complet || result.nom_raison_sociale);
}

/**
 * Traduit un résultat de l'API Recherche d'entreprises vers le modèle interne.
 * withEtablissements : recopie les établissements correspondants (recherche géographique).
 */
export function toCompany(result: ApiResult, withEtablissements = false): Company {
  const siege = result.siege;
  const finances = latestFinances(result.finances);

  return {
    siren: result.siren,
    siretSiege: siege?.siret ?? null,
    nom: result.nom_complet ?? result.nom_raison_sociale ?? result.siren,
    formeJuridiqueCode: result.nature_juridique,
    formeJuridique: libelleNatureJuridique(result.nature_juridique),
    adresse: streetAddress(siege),
    codePostal: diffusible(siege?.code_postal),
    ville: siege?.libelle_commune ?? siege?.libelle_commune_etranger ?? null,
    codeCommune: siege?.commune ?? null,
    departement: siege?.departement ?? null,
    codeNaf: result.activite_principale,
    libelleNaf: libelleNaf(result.activite_principale),
    dateCreation: result.date_creation,
    trancheEffectifCode: result.tranche_effectif_salarie,
    trancheEffectif: libelleTrancheEffectif(result.tranche_effectif_salarie),
    categorieEntreprise: result.categorie_entreprise,
    etatAdministratif: result.etat_administratif === "C" ? "cessee" : "active",
    dirigeants: (result.dirigeants ?? []).map(toDirigeant),
    chiffreAffaires: finances?.ca ?? null,
    resultatNet: finances?.resultat_net ?? null,
    anneeFinances: finances?.annee ?? null,
    source: SOURCE_NAME,
    ...(withEtablissements && {
      etablissementsDansZone: (result.matching_etablissements ?? [])
        .map(toEtablissement)
        .sort((a, b) => Number(b.ouvert) - Number(a.ouvert)),
    }),
  };
}

function toEtablissement(e: ApiEtablissement): Etablissement {
  return {
    siret: e.siret,
    adresse: streetAddress(e),
    codePostal: diffusible(e.code_postal),
    ville: e.libelle_commune,
    codeCommune: e.commune,
    estSiege: e.est_siege,
    ouvert: e.etat_administratif !== "F",
  };
}

function toDirigeant(d: NonNullable<ApiResult["dirigeants"]>[number]): Dirigeant {
  if (d.type_dirigeant === "personne morale") {
    return {
      nom: d.denomination ?? d.siren ?? "",
      fonction: d.qualite,
      type: "personne_morale",
    };
  }
  return {
    nom: [d.prenoms, d.nom].filter(Boolean).join(" "),
    fonction: d.qualite,
    type: "personne_physique",
  };
}

/**
 * L'API fournit l'adresse complète ("9 RUE X 75015 PARIS").
 * On retire le suffixe "code postal + commune" puisqu'ils ont leurs propres champs.
 */
function streetAddress(
  siege: {
    adresse: string | null;
    code_postal: string | null;
    libelle_commune: string | null;
    libelle_commune_etranger?: string | null;
    libelle_pays_etranger?: string | null;
  } | null,
): string | null {
  const full = diffusible(siege?.adresse)?.trim();
  if (!siege || !full) return null;
  const suffixes = [
    [siege.code_postal, siege.libelle_commune].filter(Boolean).join(" "),
    [siege.libelle_commune_etranger, siege.libelle_pays_etranger].filter(Boolean).join(" "),
  ].filter(Boolean);
  for (const suffix of suffixes) {
    if (full.endsWith(suffix)) {
      const street = full.slice(0, -suffix.length).trim();
      return street || null;
    }
  }
  return full;
}

function latestFinances(finances: ApiResult["finances"]) {
  if (!finances) return null;
  const years = Object.keys(finances).filter((y) => /^\d{4}$/.test(y)).sort();
  const year = years.at(-1);
  if (!year) return null;
  return { annee: Number(year), ...finances[year] };
}
