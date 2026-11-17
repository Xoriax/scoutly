/** Formatage d'affichage (fr-FR) */

/** "2021-03-15" → "15/03/2021" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const compactNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * Format compact déterministe (« 100 k € », « 1,5 M € », « 2 Md €»).
 * Intl `notation: "compact"` diffère entre Node et les navigateurs
 * (« 100 k € » vs « 100,0 k € »), ce qui provoque des erreurs d'hydratation.
 */
function eurosCompact(value: number): string {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e9, "Md"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [limit, suffix] of units) {
    if (abs >= limit) return `${compactNumber.format(value / limit)} ${suffix} €`;
  }
  return `${compactNumber.format(value)} €`;
}

const eurosFull = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuros(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return "—";
  return compact ? eurosCompact(value) : eurosFull.format(value);
}

const integer = new Intl.NumberFormat("fr-FR");

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** "Camille Laurent" → "CL" ; "Maison Rivage" → "MR" */
export function initials(name: string): string {
  const letters = name
    .split(/[\s'’-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]);
  return letters.join("").toUpperCase() || "?";
}

/** « Aujourd'hui, 09:34 » pour un échange du jour, sinon « 12/11/2026, 09:34 » (composants serveur) */
export function formatMoment(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  return `${sameDay ? "Aujourd’hui" : d.toLocaleDateString("fr-FR")}, ${time}`;
}

/** Heure seule pour un échange du jour (« 09:34 »), sinon la date (« 12/11/2026 ») */
export function formatShort(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR");
}
