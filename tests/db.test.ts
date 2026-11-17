import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import type { Company } from "@/domain/company";
import { openDatabase } from "@/lib/db";
import {
  deleteProspect,
  getProspect,
  listProspects,
  saveProspect,
  statutsOf,
  suivisSet,
} from "@/lib/prospects";
import { getDashboardStats } from "@/lib/dashboard";
import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearch,
  listNouvelles,
  recordRun,
  recordRunError,
  updateSavedSearch,
} from "@/lib/saved-searches";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:");
});

const company = (siren: string, nom = `ENTREPRISE ${siren}`): Company => ({
  siren,
  siretSiege: null,
  nom,
  formeJuridiqueCode: null,
  formeJuridique: null,
  adresse: null,
  codePostal: null,
  ville: "TOULOUSE",
  codeCommune: null,
  departement: null,
  codeNaf: null,
  libelleNaf: null,
  dateCreation: "2026-01-15",
  trancheEffectifCode: null,
  trancheEffectif: null,
  categorieEntreprise: null,
  etatAdministratif: "active",
  dirigeants: [],
  source: "test",
});

describe("prospects", () => {
  it("crée puis met à jour un suivi", () => {
    saveProspect({ siren: "111111111", nom: "A", ville: null, statut: "a_contacter", notes: "" }, db);
    saveProspect({ siren: "111111111", nom: "A", ville: "PARIS", statut: "contacte", notes: "Rappel" }, db);
    expect(getProspect("111111111", db)).toMatchObject({
      statut: "contacte",
      notes: "Rappel",
      ville: "PARIS",
    });
    expect(listProspects(undefined, db)).toHaveLength(1);
  });

  it("filtre par statut et donne les statuts d'une liste de SIREN", () => {
    saveProspect({ siren: "111111111", nom: "A", ville: null, statut: "interesse", notes: "" }, db);
    saveProspect({ siren: "222222222", nom: "B", ville: null, statut: "pas_interesse", notes: "" }, db);
    expect(listProspects("interesse", db).map((p) => p.siren)).toEqual(["111111111"]);
    expect(statutsOf(["111111111", "333333333"], db)).toEqual({ "111111111": "interesse" });
    expect(statutsOf([], db)).toEqual({});
    expect(suivisSet(db)).toEqual(new Set(["111111111", "222222222"]));
  });

  it("refuse un statut inconnu (contrainte de la base)", () => {
    expect(() =>
      saveProspect(
        { siren: "111111111", nom: "A", ville: null, statut: "inconnu" as never, notes: "" },
        db,
      ),
    ).toThrow();
  });

  it("supprime un suivi", () => {
    saveProspect({ siren: "111111111", nom: "A", ville: null, statut: "contacte", notes: "" }, db);
    deleteProspect("111111111", db);
    expect(getProspect("111111111", db)).toBeNull();
  });
});

describe("recherches sauvegardées", () => {
  it("crée, modifie et supprime une recherche", () => {
    const search = createSavedSearch({ nom: "ESN", query: "naf=62.01Z" }, db);
    expect(search).toMatchObject({ nom: "ESN", alerteActive: false, lastRunAt: null });

    const updated = updateSavedSearch(search.id, { alerteActive: true, alerteEmail: "a@b.fr" }, db);
    expect(updated).toMatchObject({ alerteActive: true, alerteEmail: "a@b.fr", nom: "ESN" });

    deleteSavedSearch(search.id, db);
    expect(getSavedSearch(search.id, db)).toBeNull();
  });

  it("première vérification = référence, sans nouveauté", () => {
    const { id } = createSavedSearch({ nom: "S", query: "q=x" }, db);
    expect(recordRun(id, [company("111111111"), company("222222222")], db)).toEqual([]);
    expect(getSavedSearch(id, db)).toMatchObject({ lastNewCount: 0 });
    expect(listNouvelles(id, 50, db)).toEqual([]);
  });

  it("signale ensuite uniquement les SIREN jamais vus", () => {
    const { id } = createSavedSearch({ nom: "S", query: "q=x" }, db);
    recordRun(id, [company("111111111")], db);

    const nouvelles = recordRun(id, [company("111111111"), company("222222222", "NOUVELLE")], db);
    expect(nouvelles.map((n) => n.siren)).toEqual(["222222222"]);
    expect(getSavedSearch(id, db)).toMatchObject({ lastNewCount: 1, lastError: null });
    expect(listNouvelles(id, 50, db).map((n) => n.nom)).toEqual(["NOUVELLE"]);

    // Une entreprise qui disparaît puis réapparaît n'est pas « nouvelle »
    recordRun(id, [company("222222222")], db);
    expect(recordRun(id, [company("111111111")], db)).toEqual([]);
  });

  it("mémorise l'erreur de vérification, effacée au passage suivant", () => {
    const { id } = createSavedSearch({ nom: "S", query: "q=x" }, db);
    recordRunError(id, "Recherche trop large", db);
    expect(getSavedSearch(id, db)?.lastError).toBe("Recherche trop large");
    recordRun(id, [], db);
    expect(getSavedSearch(id, db)?.lastError).toBeNull();
  });

  it("supprime les SIREN vus avec la recherche (clé étrangère)", () => {
    const { id } = createSavedSearch({ nom: "S", query: "q=x" }, db);
    recordRun(id, [company("111111111")], db);
    deleteSavedSearch(id, db);
    const { n } = db.prepare("SELECT count(*) AS n FROM saved_search_seen").get() as { n: number };
    expect(n).toBe(0);
  });
});

describe("fiche prospect enrichie", () => {
  const base = { siren: "111111111", nom: "A", ville: null, statut: "a_contacter" as const, notes: "" };

  it("conserve contact, montant et prochaine action lors d'un simple changement de statut", () => {
    saveProspect(
      { ...base, contact: "Camille", email: "c@a.fr", montant: 12000, prochaineAction: "Envoyer le devis" },
      db,
    );
    saveProspect({ ...base, statut: "contacte" }, db);
    expect(getProspect("111111111", db)).toMatchObject({
      statut: "contacte",
      contact: "Camille",
      email: "c@a.fr",
      montant: 12000,
      prochaineAction: "Envoyer le devis",
    });
  });

  it("permet d'effacer le montant explicitement (null)", () => {
    saveProspect({ ...base, montant: 5000 }, db);
    saveProspect({ ...base, montant: null }, db);
    expect(getProspect("111111111", db)?.montant).toBeNull();
  });
});

describe("tableau de bord", () => {
  it("agrège prospects, pipeline ouvert et alertes", () => {
    saveProspect({ siren: "111111111", nom: "A", ville: null, statut: "interesse", notes: "", montant: 10000, prochaineAction: "Devis" }, db);
    saveProspect({ siren: "222222222", nom: "B", ville: null, statut: "pas_interesse", notes: "", montant: 99999 }, db);
    saveProspect({ siren: "333333333", nom: "C", ville: null, statut: "a_contacter", notes: "" }, db);

    const { id } = createSavedSearch({ nom: "S", query: "q=x" }, db);
    updateSavedSearch(id, { alerteActive: true }, db);
    recordRun(id, [company("444444444")], db);
    recordRun(id, [company("444444444"), company("555555555", "NOUVELLE")], db);

    const stats = getDashboardStats(db);
    expect(stats.prospects).toBe(3);
    expect(stats.parStatut).toMatchObject({ interesse: 1, a_contacter: 1, pas_interesse: 1 });
    // « Pas intéressé » n'entre pas dans le pipeline
    expect(stats).toMatchObject({ pipelineMontant: 10000, opportunites: 1 });
    expect(stats).toMatchObject({ recherches: 1, recherchesSurveillees: 1, nouvellesEntreprises: 1 });
    expect(stats.recentes.map((n) => n.nom)).toEqual(["NOUVELLE"]);
  });
});
