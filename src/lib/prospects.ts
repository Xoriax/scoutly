import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { Prospect, ProspectStatut } from "@/domain/prospect";
import { getDb } from "./db";

interface Row {
  siren: string;
  nom: string;
  ville: string | null;
  statut: ProspectStatut;
  notes: string;
  updated_at: string;
}

const toProspect = (row: Row): Prospect => ({
  siren: row.siren,
  nom: row.nom,
  ville: row.ville,
  statut: row.statut,
  notes: row.notes,
  updatedAt: row.updated_at,
});

export function listProspects(statut?: ProspectStatut, db: DatabaseSync = getDb()): Prospect[] {
  const rows = statut
    ? db.prepare("SELECT * FROM prospects WHERE statut = ? ORDER BY updated_at DESC").all(statut)
    : db.prepare("SELECT * FROM prospects ORDER BY updated_at DESC").all();
  return (rows as unknown as Row[]).map(toProspect);
}

export function getProspect(siren: string, db: DatabaseSync = getDb()): Prospect | null {
  const row = db.prepare("SELECT * FROM prospects WHERE siren = ?").get(siren);
  return row ? toProspect(row as unknown as Row) : null;
}

/** Statuts de suivi d'une liste de SIREN (ceux sans suivi sont absents) */
export function statutsOf(
  sirens: string[],
  db: DatabaseSync = getDb(),
): Record<string, ProspectStatut> {
  if (sirens.length === 0) return {};
  const placeholders = sirens.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT siren, statut FROM prospects WHERE siren IN (${placeholders})`)
    .all(...sirens) as unknown as Pick<Row, "siren" | "statut">[];
  return Object.fromEntries(rows.map((r) => [r.siren, r.statut]));
}

/** Tous les SIREN suivis (pour masquer les entreprises déjà traitées) */
export function suivisSet(db: DatabaseSync = getDb()): Set<string> {
  const rows = db.prepare("SELECT siren FROM prospects").all() as unknown as { siren: string }[];
  return new Set(rows.map((r) => r.siren));
}

export function saveProspect(
  input: { siren: string; nom: string; ville: string | null; statut: ProspectStatut; notes: string },
  db: DatabaseSync = getDb(),
): Prospect {
  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO prospects (siren, nom, ville, statut, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (siren) DO UPDATE SET
       nom = excluded.nom, ville = excluded.ville, statut = excluded.statut,
       notes = excluded.notes, updated_at = excluded.updated_at`,
  ).run(input.siren, input.nom, input.ville, input.statut, input.notes, updatedAt);
  return { ...input, updatedAt };
}

export function deleteProspect(siren: string, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM prospects WHERE siren = ?").run(siren);
}
