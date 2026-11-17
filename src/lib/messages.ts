import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { Message } from "@/domain/crm";
import { getDb } from "./db";

interface Row {
  id: number;
  siren: string;
  objet: string;
  corps: string;
  recu_le: string;
  etiquette: string;
  analyse: string;
  citation: string;
  brouillon: string;
  traite: number;
}

const toMessage = (r: Row): Message => ({
  id: r.id,
  siren: r.siren,
  objet: r.objet,
  corps: r.corps,
  recuLe: r.recu_le,
  etiquette: r.etiquette,
  analyse: r.analyse,
  citation: r.citation,
  brouillon: r.brouillon,
  traite: r.traite === 1,
});

/** Échanges les plus récents d'abord */
export function listMessages(siren?: string, db: DatabaseSync = getDb()): Message[] {
  const rows = siren
    ? db.prepare("SELECT * FROM messages WHERE siren = ? ORDER BY recu_le DESC, id DESC").all(siren)
    : db.prepare("SELECT * FROM messages ORDER BY recu_le DESC, id DESC").all();
  return (rows as unknown as Row[]).map(toMessage);
}

export function getMessage(id: number, db: DatabaseSync = getDb()): Message | null {
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  return row ? toMessage(row as unknown as Row) : null;
}

export function createMessage(
  input: {
    siren: string;
    objet: string;
    corps: string;
    recuLe?: string;
    etiquette?: string;
    analyse?: string;
    citation?: string;
    brouillon?: string;
  },
  db: DatabaseSync = getDb(),
): Message {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO messages (siren, objet, corps, recu_le, etiquette, analyse, citation, brouillon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      input.siren,
      input.objet,
      input.corps,
      input.recuLe ?? new Date().toISOString(),
      input.etiquette ?? "",
      input.analyse ?? "",
      input.citation ?? "",
      input.brouillon ?? "",
    );
  return getMessage(Number(lastInsertRowid), db)!;
}

export function updateMessage(
  id: number,
  changes: { brouillon?: string; traite?: boolean },
  db: DatabaseSync = getDb(),
): Message | null {
  const current = getMessage(id, db);
  if (!current) return null;
  db.prepare("UPDATE messages SET brouillon = ?, traite = ? WHERE id = ?").run(
    changes.brouillon ?? current.brouillon,
    (changes.traite ?? current.traite) ? 1 : 0,
    id,
  );
  return getMessage(id, db);
}

export function deleteMessage(id: number, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
}

export function countNonTraites(db: DatabaseSync = getDb()): number {
  const { n } = db.prepare("SELECT count(*) AS n FROM messages WHERE traite = 0").get() as { n: number };
  return n;
}
