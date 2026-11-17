import type { Message } from "@/domain/crm";

/** Phrase clé d'un échange : la citation retenue, à défaut la première ligne après la formule d'appel */
export function messagePreview(m: Message): string {
  const quote = m.citation.replace(/^[«"\s]+|[»"\s]+$/g, "").trim();
  if (quote) return quote.charAt(0).toUpperCase() + quote.slice(1);
  return m.corps.split("\n").find((l) => l.trim() && !/^bonjour/i.test(l.trim())) ?? m.objet;
}

/** Pastille affichée : « Traité » une fois traité, sinon l'étiquette, à défaut « À traiter » */
export function messageBadge(m: Message): { label: string; positive: boolean } {
  if (m.traite) return { label: "Traité", positive: false };
  return { label: m.etiquette || "À traiter", positive: true };
}
