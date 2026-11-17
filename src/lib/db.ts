import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { globalSingleton } from "./cache";

/**
 * Base SQLite (module node:sqlite intégré à Node ≥ 22.13 : aucune dépendance à installer).
 * Fichier : DATABASE_PATH, par défaut data/scoutly.db (ignoré par Git).
 */
export function getDb(): DatabaseSync {
  return globalSingleton("db", () => openDatabase(process.env.DATABASE_PATH || "data/scoutly.db"));
}

export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

/** Schéma versionné : chaque entrée s'applique une seule fois, dans l'ordre */
export const MIGRATIONS = [
  `CREATE TABLE prospects (
     siren      TEXT PRIMARY KEY,
     nom        TEXT NOT NULL,
     ville      TEXT,
     statut     TEXT NOT NULL CHECK (statut IN ('a_contacter','contacte','interesse','pas_interesse')),
     notes      TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL
   );
   CREATE TABLE saved_searches (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     nom            TEXT NOT NULL,
     query          TEXT NOT NULL,
     alerte_active  INTEGER NOT NULL DEFAULT 0,
     alerte_email   TEXT,
     created_at     TEXT NOT NULL,
     last_run_at    TEXT,
     last_new_count INTEGER,
     last_error     TEXT
   );
   CREATE TABLE saved_search_seen (
     search_id     INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
     siren         TEXT NOT NULL,
     nom           TEXT NOT NULL,
     ville         TEXT,
     date_creation TEXT,
     first_seen_at TEXT NOT NULL,
     -- 1 pour les entreprises déjà présentes lors de la première vérification
     baseline      INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (search_id, siren)
   );`,
  // Fiche prospect enrichie : contact, opportunité et prochaine action (additif)
  `ALTER TABLE prospects ADD COLUMN contact TEXT NOT NULL DEFAULT '';
   ALTER TABLE prospects ADD COLUMN email TEXT NOT NULL DEFAULT '';
   ALTER TABLE prospects ADD COLUMN montant INTEGER;
   ALTER TABLE prospects ADD COLUMN prochaine_action TEXT NOT NULL DEFAULT '';`,
  // Statuts « À qualifier » et « En discussion » (la contrainte CHECK impose de reconstruire la
  // table), étape d'opportunité, origine, puis actions, échanges, notes et réglages
  `CREATE TABLE prospects_new (
     siren            TEXT PRIMARY KEY,
     nom              TEXT NOT NULL,
     ville            TEXT,
     statut           TEXT NOT NULL CHECK (statut IN
                        ('a_qualifier','a_contacter','contacte','en_discussion','interesse','pas_interesse')),
     notes            TEXT NOT NULL DEFAULT '',
     contact          TEXT NOT NULL DEFAULT '',
     email            TEXT NOT NULL DEFAULT '',
     montant          INTEGER,
     prochaine_action TEXT NOT NULL DEFAULT '',
     etape            TEXT NOT NULL DEFAULT '',
     secteur          TEXT NOT NULL DEFAULT '',
     effectif         TEXT NOT NULL DEFAULT '',
     origine          TEXT NOT NULL DEFAULT '',
     created_at       TEXT NOT NULL,
     updated_at       TEXT NOT NULL
   );
   INSERT INTO prospects_new
     (siren, nom, ville, statut, notes, contact, email, montant, prochaine_action, created_at, updated_at)
     SELECT siren, nom, ville, statut, notes, contact, email, montant, prochaine_action, updated_at, updated_at
     FROM prospects;
   DROP TABLE prospects;
   ALTER TABLE prospects_new RENAME TO prospects;
   CREATE TABLE prospect_notes (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     siren      TEXT NOT NULL REFERENCES prospects(siren) ON DELETE CASCADE,
     corps      TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE taches (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     siren      TEXT NOT NULL REFERENCES prospects(siren) ON DELETE CASCADE,
     titre      TEXT NOT NULL,
     raison     TEXT NOT NULL DEFAULT '',
     etiquette  TEXT NOT NULL DEFAULT '',
     echeance   TEXT NOT NULL DEFAULT '',
     terminee   INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL
   );
   CREATE TABLE messages (
     id        INTEGER PRIMARY KEY AUTOINCREMENT,
     siren     TEXT NOT NULL REFERENCES prospects(siren) ON DELETE CASCADE,
     objet     TEXT NOT NULL,
     corps     TEXT NOT NULL DEFAULT '',
     recu_le   TEXT NOT NULL,
     analyse   TEXT NOT NULL DEFAULT '',
     citation  TEXT NOT NULL DEFAULT '',
     brouillon TEXT NOT NULL DEFAULT '',
     traite    INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE reglages (
     cle    TEXT PRIMARY KEY,
     valeur TEXT NOT NULL
   );`,
  // Pastille d'un échange (« Devis demandé », « Rendez-vous confirmé »…)
  `ALTER TABLE messages ADD COLUMN etiquette TEXT NOT NULL DEFAULT '';`,
];

export function migrate(db: DatabaseSync): void {
  const { user_version: version } = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

/** Exécute fn dans une transaction */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
