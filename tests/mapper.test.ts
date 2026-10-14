import { describe, expect, it } from "vitest";
import type { ApiResult } from "@/providers/recherche-entreprises/api-types";
import { isUsableResult, toCompany } from "@/providers/recherche-entreprises/mapper";

/** Résultat de l'API Recherche d'entreprises, d'après une réponse réelle */
function apiResult(overrides: Partial<ApiResult> = {}): ApiResult {
  return {
    siren: "356000000",
    nom_complet: "LA POSTE",
    nom_raison_sociale: "LA POSTE",
    sigle: null,
    nombre_etablissements: 13131,
    nombre_etablissements_ouverts: 8862,
    siege: {
      siret: "35600000000048",
      adresse: "DIRECTION GENERALE DE LA POSTE 9 RUE DU COLONEL PIERRE AVIA 75015 PARIS",
      code_postal: "75015",
      commune: "75115",
      libelle_commune: "PARIS",
      libelle_commune_etranger: null,
      libelle_pays_etranger: null,
      departement: "75",
    },
    activite_principale: "53.10Z",
    section_activite_principale: "H",
    categorie_entreprise: "GE",
    date_creation: "1991-01-01",
    date_fermeture: null,
    dirigeants: [
      { type_dirigeant: "personne physique", nom: "BAUDRY", prenoms: "IRENE", qualite: "Administrateur" },
      { type_dirigeant: "personne morale", siren: "775726417", denomination: "KPMG SA", qualite: "Commissaire aux comptes titulaire" },
    ],
    etat_administratif: "A",
    nature_juridique: "5510",
    tranche_effectif_salarie: "53",
    finances: {
      "2023": { ca: 25_000_000_000, resultat_net: 1_000_000_000 },
      "2025": { ca: 26_700_000_000, resultat_net: 1_474_000_000 },
    },
    complements: { est_qualiopi: true, est_rge: false, egapro_renseignee: true },
    tva: ["FR39356000000"],
    ...overrides,
  };
}

describe("toCompany", () => {
  const company = toCompany(apiResult());

  it("traduit l'identité et les libellés", () => {
    expect(company).toMatchObject({
      siren: "356000000",
      siretSiege: "35600000000048",
      nom: "LA POSTE",
      formeJuridique: "SA nationale à conseil d'administration",
      codeNaf: "53.10Z",
      trancheEffectif: "10 000 salariés et plus",
      etatAdministratif: "active",
      numeroTva: "FR39356000000",
      source: "recherche-entreprises",
    });
  });

  it("retire code postal et ville de l'adresse", () => {
    expect(company.adresse).toBe("DIRECTION GENERALE DE LA POSTE 9 RUE DU COLONEL PIERRE AVIA");
    expect(company.codePostal).toBe("75015");
    expect(company.ville).toBe("PARIS");
    expect(company.codeCommune).toBe("75115");
  });

  it("retient le dernier exercice financier", () => {
    expect(company.chiffreAffaires).toBe(26_700_000_000);
    expect(company.resultatNet).toBe(1_474_000_000);
    expect(company.anneeFinances).toBe(2025);
  });

  it("traduit les dirigeants personnes physiques et morales", () => {
    expect(company.dirigeants).toEqual([
      { nom: "IRENE BAUDRY", fonction: "Administrateur", type: "personne_physique" },
      { nom: "KPMG SA", fonction: "Commissaire aux comptes titulaire", type: "personne_morale" },
    ]);
  });

  it("ne garde que les labels vrais et connus", () => {
    expect(company.labels).toEqual(["Qualiopi"]);
  });

  it("traite les champs non diffusibles comme vides", () => {
    const masked = toCompany(
      apiResult({
        siege: {
          siret: "90169665800011",
          adresse: "[NON-DIFFUSIBLE]",
          code_postal: "[NON-DIFFUSIBLE]",
          commune: "31555",
          libelle_commune: "TOULOUSE",
          libelle_commune_etranger: null,
          libelle_pays_etranger: null,
          departement: "31",
        },
      }),
    );
    expect(masked.adresse).toBeNull();
    expect(masked.codePostal).toBeNull();
    expect(masked.ville).toBe("TOULOUSE");
  });

  it("marque une entreprise cessée", () => {
    const closed = toCompany(apiResult({ etat_administratif: "C", date_fermeture: "2020-06-30" }));
    expect(closed.etatAdministratif).toBe("cessee");
    expect(closed.dateFermeture).toBe("2020-06-30");
  });

  it("n'inclut les établissements que sur demande, ouverts d'abord", () => {
    const result = apiResult({
      matching_etablissements: [
        { siret: "1", adresse: "1 RUE A 31000 TOULOUSE", code_postal: "31000", commune: "31555", libelle_commune: "TOULOUSE", est_siege: false, etat_administratif: "F" },
        { siret: "2", adresse: "2 RUE B 31500 TOULOUSE", code_postal: "31500", commune: "31555", libelle_commune: "TOULOUSE", est_siege: false, etat_administratif: "A" },
      ],
    });
    expect(toCompany(result).etablissementsDansZone).toBeUndefined();
    const etablissements = toCompany(result, true).etablissementsDansZone!;
    expect(etablissements.map((e) => [e.siret, e.ouvert, e.adresse])).toEqual([
      ["2", true, "2 RUE B"],
      ["1", false, "1 RUE A"],
    ]);
  });
});

describe("isUsableResult", () => {
  it("écarte les entrées fantômes sans nom", () => {
    expect(isUsableResult(apiResult())).toBe(true);
    expect(isUsableResult(apiResult({ nom_complet: null, nom_raison_sociale: null }))).toBe(false);
  });
});
