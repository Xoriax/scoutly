import { afterEach, describe, expect, it, vi } from "vitest";

// Nodemailer est intercepté : on vérifie l'email construit sans serveur SMTP
const sendMail = vi.fn(async (_message: Record<string, string>) => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

const { isMailConfigured, sendAlertEmail } = await import("@/lib/mailer");

afterEach(() => {
  vi.unstubAllEnvs();
  sendMail.mockClear();
});

describe("mailer", () => {
  it("n'est configuré qu'avec SMTP_HOST et SMTP_FROM", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    expect(isMailConfigured()).toBe(false);
    vi.stubEnv("SMTP_HOST", "ssl0.ovh.net");
    vi.stubEnv("SMTP_FROM", "scoutly@exemple.fr");
    expect(isMailConfigured()).toBe(true);
  });

  it("construit l'email d'alerte avec liens et noms échappés", async () => {
    vi.stubEnv("SMTP_FROM", "scoutly@exemple.fr");
    vi.stubEnv("APP_URL", "https://scoutly.exemple.fr/");
    await sendAlertEmail("equipe@exemple.fr", [
      {
        nomRecherche: "Boulangeries Toulouse",
        lien: "https://scoutly.exemple.fr/?q=boulangerie",
        nouvelles: [
          { siren: "123456789", nom: "PAIN & <CIE>", ville: "TOULOUSE", dateCreation: "2026-02-12", detecteeLe: "2026-10-14T08:00:00Z" },
          { siren: "987654321", nom: "FOURNIL", ville: null, dateCreation: null, detecteeLe: "2026-10-14T08:00:00Z" },
        ],
      },
    ]);

    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe("equipe@exemple.fr");
    expect(message.from).toBe("scoutly@exemple.fr");
    expect(message.subject).toBe("Scoutly : 2 nouvelles entreprises dans vos recherches");
    expect(message.html).toContain("PAIN &amp; &lt;CIE&gt;");
    expect(message.html).not.toContain("<CIE>");
    expect(message.html).toContain('href="https://scoutly.exemple.fr/entreprises/123456789"');
    expect(message.text).toContain("PAIN & <CIE> (TOULOUSE), créée le 12/02/2026");
  });
});
