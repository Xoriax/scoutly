import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { ProspectNote } from "@/domain/crm";
import { getDb } from "./db";

interface Row {
  id: number;
  siren: string;
  corps: string;
  created_at: string;
}

const toNote = (r: Row): ProspectNote => ({ id: r.id, siren: r.siren, corps: r.corps, createdAt: r.created_at });

/** Notes d'un prospect, les plus récentes d'abord */
export function listNotes(siren: string, db: DatabaseSync = getDb()): ProspectNote[] {
  const rows = db
    .prepare("SELECT * FROM prospect_notes WHERE siren = ? ORDER BY created_at DESC, id DESC")
    .all(siren) as unknown as Row[];
  return rows.map(toNote);
}

export function addNote(siren: string, corps: string, db: DatabaseSync = getDb()): ProspectNote {
  const createdAt = new Date().toISOString();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO prospect_notes (siren, corps, created_at) VALUES (?, ?, ?)")
    .run(siren, corps, createdAt);
  return { id: Number(lastInsertRowid), siren, corps, createdAt };
}
