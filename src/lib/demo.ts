import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { ProspectStatut } from "@/domain/prospect";
import { getDb, transaction } from "./db";
import { createMessage } from "./messages";
import { saveProspect } from "./prospects";
import { createTache } from "./tasks";

/** Données de démonstration de la maquette (entreprises fictives, SIREN 000000001 à 000000008) */
const PROSPECTS: {
  siren: string; nom: string; contact: string; role: string; ville: string; secteur: string;
  statut: ProspectStatut; montant: number | null; etape: string; action: string; email: string; effectif: string;
}[] = [
  { siren: "000000001", nom: "Maison Rivage", contact: "Camille Laurent", role: "Directrice générale", ville: "Nantes", secteur: "Hôtellerie", statut: "en_discussion", montant: 12000, etape: "Proposition envoyée", action: "Envoyer le devis · aujourd'hui", email: "camille@maison-rivage.example", effectif: "20 à 49 salariés" },
  { siren: "000000002", nom: "Atelier Boréal", contact: "Thomas Morel", role: "Responsable des opérations", ville: "Lyon", secteur: "Architecture", statut: "en_discussion", montant: 18000, etape: "Besoin identifié", action: "Répondre au besoin · aujourd'hui", email: "thomas@atelier-boreal.example", effectif: "10 à 19 salariés" },
  { siren: "000000003", nom: "Nova Industrie", contact: "Inès Petit", role: "Directrice des achats", ville: "Bordeaux", secteur: "Industrie", statut: "en_discussion", montant: 16800, etape: "Négociation", action: "Préparer le rendez-vous · 15:00", email: "ines@nova-industrie.example", effectif: "50 à 99 salariés" },
  { siren: "000000004", nom: "Studio Amande", contact: "Julie Bernard", role: "Fondatrice", ville: "Paris", secteur: "Design", statut: "a_contacter", montant: null, etape: "", action: "Premier contact · aujourd'hui", email: "julie@studio-amande.example", effectif: "2 à 9 salariés" },
  { siren: "000000005", nom: "Canopée Conseil", contact: "Hugo Lefèvre", role: "Associé", ville: "Rennes", secteur: "Conseil", statut: "a_contacter", montant: null, etape: "", action: "Prise de contact · demain", email: "hugo@canopee-conseil.example", effectif: "10 à 19 salariés" },
  { siren: "000000006", nom: "Les Jardins d'Alba", contact: "Sarah Roux", role: "Gérante", ville: "Lille", secteur: "Paysagisme", statut: "a_qualifier", montant: null, etape: "", action: "Vérifier le besoin", email: "sarah@jardins-alba.example", effectif: "10 à 19 salariés" },
  { siren: "000000007", nom: "Horizon Mobilité", contact: "Lucas André", role: "Directeur commercial", ville: "Toulouse", secteur: "Mobilité", statut: "a_qualifier", montant: null, etape: "", action: "Identifier le décideur", email: "lucas@horizon-mobilite.example", effectif: "20 à 49 salariés" },
  { siren: "000000008", nom: "Épure Énergie", contact: "Emma Garcia", role: "Présidente", ville: "Montpellier", secteur: "Énergie", statut: "a_qualifier", montant: null, etape: "", action: "Compléter la fiche", email: "emma@epure-energie.example", effectif: "2 à 9 salariés" },
];

const today = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const isDemoKey = (siren: string) => /^00000000[1-8]$/.test(siren);

export function hasDemo(db: DatabaseSync = getDb()): boolean {
  return db.prepare("SELECT 1 FROM prospects WHERE siren BETWEEN '000000001' AND '000000008' LIMIT 1").get() !== undefined;
}

/** Charge la maquette (prospects, échanges, actions). Sans effet si elle est déjà chargée. */
export function seedDemo(db: DatabaseSync = getDb()): boolean {
  if (hasDemo(db)) return false;
  transaction(db, () => {
    for (const p of PROSPECTS) {
      saveProspect(
        {
          siren: p.siren, nom: p.nom, ville: p.ville.toUpperCase(), statut: p.statut, notes: "",
          contact: p.contact, email: p.email, montant: p.montant, prochaineAction: p.action,
          etape: p.etape, secteur: p.secteur, effectif: p.effectif,
        },
        db,
      );
    }
    createMessage({ siren: "000000001", objet: "RE : Votre proposition pour nos établissements", recuLe: today("09:34"), etiquette: "Devis demandé",
      corps: "Bonjour Léa,\n\nMerci pour notre échange. Votre proposition nous intéresse pour nos deux établissements. Pouvez-vous nous transmettre le devis avant vendredi ?\n\nBien à vous,\nCamille",
      analyse: "Demande de devis pour deux établissements. Échéance explicite : avant vendredi.",
      citation: "« Pouvez-vous nous transmettre le devis avant vendredi ? »",
      brouillon: "Bonjour Camille,\n\nMerci pour votre retour. Je prépare une proposition pour vos deux établissements et reviens vers vous avec le devis avant vendredi.\n\nBien à vous,\nLéa" }, db);
    createMessage({ siren: "000000002", objet: "Une question sur le périmètre", recuLe: today("09:12"), etiquette: "Besoin à préciser",
      corps: "Bonjour Léa,\n\nEst-ce possible de démarrer avec notre équipe de Lyon, puis d'intégrer nos autres bureaux dans un second temps ? Nous souhaitons commencer en novembre.\n\nMerci,\nThomas",
      analyse: "Déploiement progressif demandé. Démarrage souhaité en novembre. Faisabilité à confirmer.",
      citation: "« démarrer avec notre équipe de Lyon, puis d'intégrer nos autres bureaux »",
      brouillon: "Bonjour Thomas,\n\nMerci pour ces précisions. Pour cadrer le démarrage à Lyon, combien de personnes seraient concernées ? Je vérifierai ensuite les modalités d'extension aux autres bureaux.\n\nBien à vous,\nLéa" }, db);
    createMessage({ siren: "000000003", objet: "Confirmation de notre rendez-vous", recuLe: today("08:56"), etiquette: "Rendez-vous confirmé",
      corps: "Bonjour Léa,\n\nJe vous confirme notre rendez-vous à 15 h. Nous pourrons revoir les options et le calendrier de mise en place.\n\nÀ tout à l'heure,\nInès",
      analyse: "Rendez-vous confirmé à 15 h. Points à préparer : options et calendrier.",
      citation: "« notre rendez-vous à 15 h »",
      brouillon: "Bonjour Inès,\n\nMerci pour votre confirmation. À tout à l'heure à 15 h pour faire le point sur les options et le calendrier.\n\nBien à vous,\nLéa" }, db);
    createTache({ siren: "000000001", titre: "Envoyer le devis à Camille", raison: "Engagement à tenir · proposition attendue", etiquette: "Aujourd'hui", echeance: "Avant 12:00" }, db);
    createTache({ siren: "000000002", titre: "Répondre à Thomas", raison: "Une question bloque le cadrage du projet", etiquette: "Réponse attendue", echeance: "Ce matin" }, db);
    createTache({ siren: "000000003", titre: "Préparer le rendez-vous Nova", raison: "Options et calendrier à confirmer", etiquette: "Rendez-vous", echeance: "15:00" }, db);
    createTache({ siren: "000000004", titre: "Contacter Studio Amande", raison: "Prospect ajouté depuis une recherche sauvegardée", etiquette: "Premier contact", echeance: "Aujourd'hui" }, db);
  });
  return true;
}

/** Retire les données de démonstration (les prospects réels ne sont pas touchés) */
export function clearDemo(db: DatabaseSync = getDb()): void {
  // Les actions, échanges et notes partent avec leur prospect (clé étrangère en cascade)
  db.prepare("DELETE FROM prospects WHERE siren BETWEEN '000000001' AND '000000008'").run();
}
