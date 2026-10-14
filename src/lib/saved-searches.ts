import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { Company } from "@/domain/company";
import type { NouvelleEntreprise, SavedSearch } from "@/domain/prospect";
import { getDb, transaction } from "./db";

interface Row {
  id: number;
  nom: string;
  query: string;
  alerte_active: number;
  alerte_email: string | null;
  created_at: string;
  last_run_at: string | null;
  last_new_count: number | null;
  last_error: string | null;
}

const toSavedSearch = (row: Row): SavedSearch => ({
  id: row.id,
  nom: row.nom,
  query: row.query,
  alerteActive: row.alerte_active === 1,
  alerteEmail: row.alerte_email,
  createdAt: row.created_at,
  lastRunAt: row.last_run_at,
  lastNewCount: row.last_new_count,
  lastError: row.last_error,
});

export function listSavedSearches(db: DatabaseSync = getDb()): SavedSearch[] {
  const rows = db.prepare("SELECT * FROM saved_searches ORDER BY created_at DESC, id DESC").all();
  return (rows as unknown as Row[]).map(toSavedSearch);
}

export function getSavedSearch(id: number, db: DatabaseSync = getDb()): SavedSearch | null {
  const row = db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(id);
  return row ? toSavedSearch(row as unknown as Row) : null;
}

export function createSavedSearch(
  input: { nom: string; query: string },
  db: DatabaseSync = getDb(),
): SavedSearch {
  const result = db
    .prepare("INSERT INTO saved_searches (nom, query, created_at) VALUES (?, ?, ?)")
    .run(input.nom, input.query, new Date().toISOString());
  return getSavedSearch(Number(result.lastInsertRowid), db)!;
}

export function updateSavedSearch(
  id: number,
  changes: { nom?: string; alerteActive?: boolean; alerteEmail?: string | null },
  db: DatabaseSync = getDb(),
): SavedSearch | null {
  const current = getSavedSearch(id, db);
  if (!current) return null;
  db.prepare("UPDATE saved_searches SET nom = ?, alerte_active = ?, alerte_email = ? WHERE id = ?").run(
    changes.nom ?? current.nom,
    (changes.alerteActive ?? current.alerteActive) ? 1 : 0,
    changes.alerteEmail === undefined ? current.alerteEmail : changes.alerteEmail,
    id,
  );
  return getSavedSearch(id, db);
}

export function deleteSavedSearch(id: number, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM saved_searches WHERE id = ?").run(id);
}

/**
 * Enregistre le résultat d'une vérification : les SIREN jamais vus sont mémorisés.
 * À la toute première vérification, tout est « déjà connu » (baseline) : pas d'alerte.
 * Renvoie les nouvelles entreprises (vide à la première vérification).
 */
export function recordRun(
  searchId: number,
  companies: Company[],
  db: DatabaseSync = getDb(),
): NouvelleEntreprise[] {
  const now = new Date().toISOString();
  return transaction(db, () => {
    const search = getSavedSearch(searchId, db);
    if (!search) return [];
    const baseline = search.lastRunAt === null;
    const known = new Set(
      (
        db.prepare("SELECT siren FROM saved_search_seen WHERE search_id = ?").all(searchId) as unknown as {
          siren: string;
        }[]
      ).map((r) => r.siren),
    );
    const insert = db.prepare(
      `INSERT INTO saved_search_seen (search_id, siren, nom, ville, date_creation, first_seen_at, baseline)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const nouvelles: NouvelleEntreprise[] = [];
    for (const company of companies) {
      if (known.has(company.siren)) continue;
      known.add(company.siren);
      insert.run(searchId, company.siren, company.nom, company.ville, company.dateCreation, now, baseline ? 1 : 0);
      if (!baseline) {
        nouvelles.push({
          siren: company.siren,
          nom: company.nom,
          ville: company.ville,
          dateCreation: company.dateCreation,
          detecteeLe: now,
        });
      }
    }
    db.prepare(
      "UPDATE saved_searches SET last_run_at = ?, last_new_count = ?, last_error = NULL WHERE id = ?",
    ).run(now, nouvelles.length, searchId);
    return nouvelles;
  });
}

export function recordRunError(searchId: number, message: string, db: DatabaseSync = getDb()): void {
  db.prepare("UPDATE saved_searches SET last_error = ? WHERE id = ?").run(message, searchId);
}

/** Nouvelles entreprises détectées (hors baseline), les plus récentes d'abord */
export function listNouvelles(
  searchId: number,
  limit = 50,
  db: DatabaseSync = getDb(),
): NouvelleEntreprise[] {
  const rows = db
    .prepare(
      `SELECT siren, nom, ville, date_creation, first_seen_at FROM saved_search_seen
       WHERE search_id = ? AND baseline = 0
       ORDER BY first_seen_at DESC, date_creation DESC LIMIT ?`,
    )
    .all(searchId, limit) as unknown as {
    siren: string;
    nom: string;
    ville: string | null;
    date_creation: string | null;
    first_seen_at: string;
  }[];
  return rows.map((r) => ({
    siren: r.siren,
    nom: r.nom,
    ville: r.ville,
    dateCreation: r.date_creation,
    detecteeLe: r.first_seen_at,
  }));
}
