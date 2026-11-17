import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { Prospect, ProspectDetails, ProspectStatut } from "@/domain/prospect";
import { getDb } from "./db";

interface Row {
  siren: string;
  nom: string;
  ville: string | null;
  statut: ProspectStatut;
  notes: string;
  contact: string;
  email: string;
  montant: number | null;
  prochaine_action: string;
  etape: string;
  secteur: string;
  effectif: string;
  origine: string;
  created_at: string;
  updated_at: string;
}

const toProspect = (row: Row): Prospect => ({
  siren: row.siren,
  nom: row.nom,
  ville: row.ville,
  statut: row.statut,
  notes: row.notes,
  contact: row.contact,
  email: row.email,
  montant: row.montant,
  prochaineAction: row.prochaine_action,
  etape: row.etape,
  secteur: row.secteur,
  effectif: row.effectif,
  origine: row.origine,
  createdAt: row.created_at,
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

/**
 * Crée ou met à jour le suivi. Les champs de `ProspectDetails` non fournis conservent leur
 * valeur actuelle : un simple changement de statut n'efface ni le contact ni le montant.
 */
export function saveProspect(
  input: { siren: string; nom: string; ville: string | null; statut: ProspectStatut; notes: string } & ProspectDetails,
  db: DatabaseSync = getDb(),
): Prospect {
  const current = getProspect(input.siren, db);
  const updatedAt = new Date().toISOString();
  const prospect: Prospect = {
    siren: input.siren,
    nom: input.nom,
    ville: input.ville,
    statut: input.statut,
    notes: input.notes,
    contact: input.contact ?? current?.contact ?? "",
    email: input.email ?? current?.email ?? "",
    montant: input.montant !== undefined ? input.montant : (current?.montant ?? null),
    prochaineAction: input.prochaineAction ?? current?.prochaineAction ?? "",
    etape: input.etape ?? current?.etape ?? "",
    secteur: input.secteur ?? current?.secteur ?? "",
    effectif: input.effectif ?? current?.effectif ?? "",
    // L'origine est celle du premier suivi : un changement ultérieur ne l'écrase pas
    origine: current?.origine || input.origine || "",
    createdAt: current?.createdAt ?? updatedAt,
    updatedAt,
  };
  db.prepare(
    `INSERT INTO prospects
       (siren, nom, ville, statut, notes, contact, email, montant, prochaine_action,
        etape, secteur, effectif, origine, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (siren) DO UPDATE SET
       nom = excluded.nom, ville = excluded.ville, statut = excluded.statut,
       notes = excluded.notes, contact = excluded.contact, email = excluded.email,
       montant = excluded.montant, prochaine_action = excluded.prochaine_action,
       etape = excluded.etape, secteur = excluded.secteur, effectif = excluded.effectif,
       origine = excluded.origine, updated_at = excluded.updated_at`,
  ).run(
    prospect.siren, prospect.nom, prospect.ville, prospect.statut, prospect.notes,
    prospect.contact, prospect.email, prospect.montant, prospect.prochaineAction,
    prospect.etape, prospect.secteur, prospect.effectif, prospect.origine,
    prospect.createdAt, updatedAt,
  );
  return prospect;
}

/** Identifiant suivant pour un prospect saisi à la main : M1, M2… */
export function nextManualKey(db: DatabaseSync = getDb()): string {
  const row = db
    .prepare("SELECT max(CAST(substr(siren, 2) AS INTEGER)) AS n FROM prospects WHERE siren LIKE 'M%'")
    .get() as { n: number | null };
  return `M${(row.n ?? 0) + 1}`;
}

export function deleteProspect(siren: string, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM prospects WHERE siren = ?").run(siren);
}
