import "server-only";
import nodemailer from "nodemailer";
import type { NouvelleEntreprise } from "@/domain/prospect";
import { formatDate } from "./format";

/**
 * Envoi d'emails par SMTP (ex. OVH : ssl0.ovh.net, port 465).
 * Sans SMTP_HOST, aucun email n'est envoyé : les nouveautés restent visibles dans l'application.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function transport() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export interface AlertSection {
  nomRecherche: string;
  /** Lien vers la recherche dans l'application */
  lien: string | null;
  nouvelles: NouvelleEntreprise[];
}

/** Adresse publique de l'application, pour les liens des emails */
const appUrl = () => process.env.APP_URL?.replace(/\/$/, "") || null;

export async function sendAlertEmail(to: string, sections: AlertSection[]): Promise<void> {
  const total = sections.reduce((sum, s) => sum + s.nouvelles.length, 0);
  await transport().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Scoutly : ${total} nouvelle${total > 1 ? "s" : ""} entreprise${total > 1 ? "s" : ""} dans vos recherches`,
    text: alertText(sections),
    html: alertHtml(sections),
  });
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ficheUrl = (siren: string) => (appUrl() ? `${appUrl()}/entreprises/${siren}` : null);

function alertText(sections: AlertSection[]): string {
  return sections
    .map((s) =>
      [
        `${s.nomRecherche} : ${s.nouvelles.length} nouvelle(s) entreprise(s)`,
        ...s.nouvelles.map(
          (n) =>
            `- ${n.nom}${n.ville ? ` (${n.ville})` : ""}, créée le ${formatDate(n.dateCreation)}` +
            (ficheUrl(n.siren) ? ` : ${ficheUrl(n.siren)}` : ""),
        ),
      ].join("\n"),
    )
    .join("\n\n");
}

function alertHtml(sections: AlertSection[]): string {
  const blocks = sections.map((s) => {
    const rows = s.nouvelles
      .map((n) => {
        const url = ficheUrl(n.siren);
        const nom = url
          ? `<a href="${escapeHtml(url)}">${escapeHtml(n.nom)}</a>`
          : escapeHtml(n.nom);
        return `<tr><td style="padding:4px 12px 4px 0">${nom}</td><td style="padding:4px 12px 4px 0;color:#475569">${escapeHtml(n.ville ?? "")}</td><td style="padding:4px 0;color:#475569">${formatDate(n.dateCreation)}</td></tr>`;
      })
      .join("");
    const titre = s.lien
      ? `<a href="${escapeHtml(s.lien)}">${escapeHtml(s.nomRecherche)}</a>`
      : escapeHtml(s.nomRecherche);
    return `<h2 style="font-size:16px;margin:24px 0 8px">${titre} : ${s.nouvelles.length} nouvelle(s)</h2>
<table style="border-collapse:collapse;font-size:14px"><tr style="text-align:left;color:#64748b"><th style="padding:4px 12px 4px 0">Entreprise</th><th style="padding:4px 12px 4px 0">Ville</th><th style="padding:4px 0">Création</th></tr>${rows}</table>`;
  });
  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
<p>Nouvelles entreprises apparues dans vos recherches surveillées :</p>${blocks.join("")}
<p style="margin-top:24px;font-size:12px;color:#64748b">Vous recevez cet email car une alerte est activée dans Scoutly.</p></div>`;
}

export { appUrl };
