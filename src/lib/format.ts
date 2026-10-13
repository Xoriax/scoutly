/** Formatage d'affichage (fr-FR) */

/** "2021-03-15" → "15/03/2021" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const eurosCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const eurosFull = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuros(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return "—";
  return (compact ? eurosCompact : eurosFull).format(value);
}

const integer = new Intl.NumberFormat("fr-FR");

export function formatInteger(value: number): string {
  return integer.format(value);
}
