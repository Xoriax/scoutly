import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { Tache } from "@/domain/crm";
import { getDb } from "./db";

interface Row {
  id: number;
  siren: string;
  titre: string;
  raison: string;
  etiquette: string;
  echeance: string;
  terminee: number;
  created_at: string;
}

const toTache = (r: Row): Tache => ({
  id: r.id,
  siren: r.siren,
  titre: r.titre,
  raison: r.raison,
  etiquette: r.etiquette,
  echeance: r.echeance,
  terminee: r.terminee === 1,
  createdAt: r.created_at,
});

/** Actions à faire d'abord (les plus anciennes en premier), puis les terminées */
export function listTaches(
  opts: { siren?: string; aFaire?: boolean } = {},
  db: DatabaseSync = getDb(),
): Tache[] {
  const where: string[] = [];
  const args: string[] = [];
  if (opts.siren) {
    where.push("siren = ?");
    args.push(opts.siren);
  }
  if (opts.aFaire) where.push("terminee = 0");
  const rows = db
    .prepare(
      `SELECT * FROM taches ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY terminee ASC, id ASC`,
    )
    .all(...args) as unknown as Row[];
  return rows.map(toTache);
}

export function createTache(
  input: { siren: string; titre: string; raison?: string; etiquette?: string; echeance?: string },
  db: DatabaseSync = getDb(),
): Tache {
  const createdAt = new Date().toISOString();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO taches (siren, titre, raison, etiquette, echeance, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(input.siren, input.titre, input.raison ?? "", input.etiquette ?? "", input.echeance ?? "", createdAt);
  return getTache(Number(lastInsertRowid), db)!;
}

export function getTache(id: number, db: DatabaseSync = getDb()): Tache | null {
  const row = db.prepare("SELECT * FROM taches WHERE id = ?").get(id);
  return row ? toTache(row as unknown as Row) : null;
}

export function setTacheTerminee(id: number, terminee: boolean, db: DatabaseSync = getDb()): Tache | null {
  db.prepare("UPDATE taches SET terminee = ? WHERE id = ?").run(terminee ? 1 : 0, id);
  return getTache(id, db);
}

export function deleteTache(id: number, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM taches WHERE id = ?").run(id);
}
