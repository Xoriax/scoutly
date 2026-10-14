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
const MIGRATIONS = [
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
];

function migrate(db: DatabaseSync): void {
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
