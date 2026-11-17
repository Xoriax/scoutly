import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { messageBadge, messagePreview } from "@/components/messaging/preview";
import { getNavCounts } from "@/lib/dashboard";
import { MIGRATIONS, migrate, openDatabase } from "@/lib/db";
import { clearDemo, hasDemo, seedDemo } from "@/lib/demo";
import { countNonTraites, createMessage, listMessages, updateMessage } from "@/lib/messages";
import { addNote, listNotes } from "@/lib/notes";
import { deleteProspect, getProspect, listProspects, nextManualKey, saveProspect } from "@/lib/prospects";
import { getSequence, updateSequence } from "@/lib/sequence";
import { createTache, listTaches, setTacheTerminee } from "@/lib/tasks";

let db: DatabaseSync;
beforeEach(() => {
  db = openDatabase(":memory:");
});

const base = { nom: "A", ville: null, statut: "a_qualifier" as const, notes: "" };

describe("migration", () => {
  it("conserve les prospects existants en reconstruisant la table", () => {
    const old = new DatabaseSync(":memory:");
    old.exec("PRAGMA foreign_keys = ON;");
    for (const sql of MIGRATIONS.slice(0, 2)) old.exec(sql);
    old.exec("PRAGMA user_version = 2");
    old
      .prepare(
        "INSERT INTO prospects (siren, nom, ville, statut, notes, contact, montant, prochaine_action, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run("356000000", "LA POSTE", "PARIS", "interesse", "Rappeler", "Camille", 5000, "Devis", "2026-01-02T00:00:00.000Z");

    migrate(old);

    expect(getProspect("356000000", old)).toMatchObject({
      nom: "LA POSTE",
      statut: "interesse",
      notes: "Rappeler",
      contact: "Camille",
      montant: 5000,
      prochaineAction: "Devis",
      createdAt: "2026-01-02T00:00:00.000Z",
      origine: "",
    });
    // Les nouveaux statuts sont désormais acceptés
    saveProspect({ ...base, siren: "111111111", statut: "en_discussion" }, old);
    expect(getProspect("111111111", old)?.statut).toBe("en_discussion");
  });
});

describe("prospects", () => {
  it("garde l'origine du premier suivi et la date d'ajout", () => {
    saveProspect({ ...base, siren: "111111111", origine: "q=hotel" }, db);
    const first = getProspect("111111111", db)!;
    saveProspect({ ...base, siren: "111111111", statut: "contacte", origine: "q=autre" }, db);
    expect(getProspect("111111111", db)).toMatchObject({ origine: "q=hotel", createdAt: first.createdAt });
  });

  it("génère des identifiants M1, M2… pour les prospects saisis à la main", () => {
    expect(nextManualKey(db)).toBe("M1");
    saveProspect({ ...base, siren: "M1" }, db);
    saveProspect({ ...base, siren: "M2" }, db);
    expect(nextManualKey(db)).toBe("M3");
  });
});

describe("actions, échanges et notes", () => {
  beforeEach(() => {
    saveProspect({ ...base, siren: "111111111" }, db);
  });

  it("liste les actions à faire avant les terminées", () => {
    const a = createTache({ siren: "111111111", titre: "A" }, db);
    createTache({ siren: "111111111", titre: "B" }, db);
    setTacheTerminee(a.id, true, db);
    expect(listTaches({}, db).map((t) => t.titre)).toEqual(["B", "A"]);
    expect(listTaches({ aFaire: true }, db).map((t) => t.titre)).toEqual(["B"]);
    expect(setTacheTerminee(a.id, false, db)?.terminee).toBe(false);
  });

  it("compte les échanges non traités et enregistre le brouillon", () => {
    const m = createMessage({ siren: "111111111", objet: "RE", corps: "Bonjour" }, db);
    expect(countNonTraites(db)).toBe(1);
    updateMessage(m.id, { brouillon: "Réponse" }, db);
    expect(listMessages("111111111", db)[0]).toMatchObject({ brouillon: "Réponse", traite: false });
    updateMessage(m.id, { traite: true }, db);
    expect(countNonTraites(db)).toBe(0);
    expect(listMessages("111111111", db)[0].brouillon).toBe("Réponse");
  });

  it("mémorise l'étiquette et en tire la pastille et l'aperçu", () => {
    const m = createMessage(
      {
        siren: "111111111",
        objet: "RE",
        corps: "Bonjour Léa,\n\nMerci pour votre retour.",
        etiquette: "Devis demandé",
        citation: "« pouvez-vous envoyer le devis ? »",
      },
      db,
    );
    expect(m.etiquette).toBe("Devis demandé");
    expect(messageBadge(m)).toEqual({ label: "Devis demandé", positive: true });
    expect(messagePreview(m)).toBe("Pouvez-vous envoyer le devis ?");
    expect(messageBadge({ ...m, traite: true })).toEqual({ label: "Traité", positive: false });
    // Sans citation ni étiquette : première ligne utile, pastille « À traiter »
    const brut = { ...m, citation: "", etiquette: "" };
    expect(messagePreview(brut)).toBe("Merci pour votre retour.");
    expect(messageBadge(brut).label).toBe("À traiter");
  });

  it("ajoute des notes, la plus récente d'abord", () => {
    addNote("111111111", "première", db);
    addNote("111111111", "seconde", db);
    expect(listNotes("111111111", db).map((n) => n.corps)).toEqual(["seconde", "première"]);
  });

  it("supprime actions, échanges et notes avec le prospect", () => {
    createTache({ siren: "111111111", titre: "A" }, db);
    createMessage({ siren: "111111111", objet: "RE", corps: "x" }, db);
    addNote("111111111", "n", db);
    deleteProspect("111111111", db);
    expect(listTaches({}, db)).toEqual([]);
    expect(listMessages(undefined, db)).toEqual([]);
    expect(listNotes("111111111", db)).toEqual([]);
  });
});

describe("séquence", () => {
  it("a des valeurs par défaut puis mémorise les changements", () => {
    expect(getSequence(db)).toEqual({ active: true, absences: true, mode: "Validation avant envoi" });
    updateSequence({ active: false }, db);
    updateSequence({ mode: "Brouillons uniquement" }, db);
    expect(getSequence(db)).toEqual({ active: false, absences: true, mode: "Brouillons uniquement" });
  });
});

describe("données de démonstration", () => {
  it("se charge une seule fois et se retire sans toucher aux vrais prospects", () => {
    saveProspect({ ...base, siren: "356000000", nom: "VRAIE" }, db);
    expect(seedDemo(db)).toBe(true);
    expect(seedDemo(db)).toBe(false);
    expect(hasDemo(db)).toBe(true);
    expect(listProspects(undefined, db)).toHaveLength(9);
    expect(getNavCounts(db)).toEqual({ prospects: 9, messages: 3 });
    expect(listTaches({ aFaire: true }, db)).toHaveLength(4);

    clearDemo(db);
    expect(hasDemo(db)).toBe(false);
    expect(listProspects(undefined, db).map((p) => p.nom)).toEqual(["VRAIE"]);
    expect(listMessages(undefined, db)).toEqual([]);
  });
});
