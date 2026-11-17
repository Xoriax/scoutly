import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { SEND_MODES, type SequenceSettings } from "@/domain/crm";
import { getDb } from "./db";

const KEY = "sequence";
const DEFAULTS: SequenceSettings = { active: true, absences: true, mode: "Validation avant envoi" };

export function getSequence(db: DatabaseSync = getDb()): SequenceSettings {
  const row = db.prepare("SELECT valeur FROM reglages WHERE cle = ?").get(KEY) as { valeur: string } | undefined;
  if (!row) return DEFAULTS;
  try {
    const parsed = JSON.parse(row.valeur) as Partial<SequenceSettings>;
    return {
      active: typeof parsed.active === "boolean" ? parsed.active : DEFAULTS.active,
      absences: typeof parsed.absences === "boolean" ? parsed.absences : DEFAULTS.absences,
      mode: SEND_MODES.includes(parsed.mode as never) ? (parsed.mode as SequenceSettings["mode"]) : DEFAULTS.mode,
    };
  } catch {
    return DEFAULTS;
  }
}

export function updateSequence(changes: Partial<SequenceSettings>, db: DatabaseSync = getDb()): SequenceSettings {
  const next = { ...getSequence(db), ...changes };
  db.prepare(
    "INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur",
  ).run(KEY, JSON.stringify(next));
  return next;
}
