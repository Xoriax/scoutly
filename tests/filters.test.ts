import { describe, expect, it } from "vitest";
import type { Company } from "@/domain/company";
import {
  activeFilterKeys,
  isInZone,
  matchesDateCreation,
  matchesSiegeZone,
} from "@/domain/filters";

const company = (overrides: Partial<Company> = {}): Company => ({
  siren: "123456789",
  siretSiege: null,
  nom: "TEST",
  formeJuridiqueCode: null,
  formeJuridique: null,
  adresse: null,
  codePostal: "31000",
  ville: "TOULOUSE",
  codeCommune: "31555",
  departement: "31",
  codeNaf: null,
  libelleNaf: null,
  dateCreation: "2021-06-15",
  trancheEffectifCode: null,
  trancheEffectif: null,
  categorieEntreprise: null,
  etatAdministratif: "active",
  dirigeants: [],
  source: "test",
  ...overrides,
});

describe("activeFilterKeys", () => {
  it("ignore les valeurs vides", () => {
    expect(
      activeFilterKeys({ q: "", codesNaf: [], activesUniquement: false, departements: ["31"] }),
    ).toEqual(["departements"]);
  });
});

describe("matchesDateCreation", () => {
  it("bornes incluses", () => {
    expect(matchesDateCreation(company(), { dateCreationMin: "2021-06-15" })).toBe(true);
    expect(matchesDateCreation(company(), { dateCreationMax: "2021-06-15" })).toBe(true);
    expect(matchesDateCreation(company(), { dateCreationMin: "2021-06-16" })).toBe(false);
  });

  it("exclut une date inconnue dès qu'une borne est fixée", () => {
    expect(matchesDateCreation(company({ dateCreation: null }), {})).toBe(true);
    expect(matchesDateCreation(company({ dateCreation: null }), { dateCreationMin: "2000-01-01" })).toBe(false);
  });
});

describe("isInZone", () => {
  const toulouse = { departement: "31", codeCommune: "31555" };

  it("vrai si aucune zone", () => {
    expect(isInZone(toulouse, {})).toBe(true);
  });

  it("par département, région (via le département) ou commune", () => {
    expect(isInZone(toulouse, { departements: ["31"] })).toBe(true);
    expect(isInZone(toulouse, { regions: ["76"] })).toBe(true);
    expect(isInZone(toulouse, { communes: ["31555"] })).toBe(true);
    expect(isInZone(toulouse, { regions: ["11"], departements: ["33"] })).toBe(false);
  });

  it("déduit le département du code commune", () => {
    expect(isInZone({ codeCommune: "31555" }, { departements: ["31"] })).toBe(true);
    expect(isInZone({ codeCommune: "97411" }, { departements: ["974"] })).toBe(true);
  });

  it("reconnaît un arrondissement de Paris pour la ville de Paris", () => {
    expect(isInZone({ codeCommune: "75108" }, { communes: ["75056"] })).toBe(true);
  });
});

describe("matchesSiegeZone", () => {
  it("ne filtre que si le critère est demandé", () => {
    const paris = company({ departement: "75", codeCommune: "75115" });
    expect(matchesSiegeZone(paris, { departements: ["31"] })).toBe(true);
    expect(matchesSiegeZone(paris, { departements: ["31"], siegeDansZone: true })).toBe(false);
  });
});
