import { describe, expect, it } from "vitest";
import { normalizeNaf, parseSearchParams, toSearchParams } from "@/lib/search-params";

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

describe("normalizeNaf", () => {
  it("ajoute le point et met en majuscules", () => {
    expect(normalizeNaf("6201z")).toBe("62.01Z");
    expect(normalizeNaf("62.01Z")).toBe("62.01Z");
    expect(normalizeNaf(" 62 01 z ")).toBe("62.01Z");
  });
});

describe("parseSearchParams", () => {
  it("lit et normalise les critères", () => {
    const result = parse("q=  boulangerie &naf=6201z,62.01Z&dep=1,2a&ville=31555&effectif=11,12&actives=1");
    expect(result).toEqual({
      ok: true,
      page: 1,
      options: {},
      filters: {
        q: "boulangerie",
        codesNaf: ["62.01Z"],
        departements: ["01", "2A"],
        communes: ["31555"],
        tranchesEffectif: ["11", "12"],
        activesUniquement: true,
      },
    });
  });

  it("refuse un code NAF inconnu en le citant", () => {
    const result = parse("naf=99.99Z");
    expect(result).toEqual({ ok: false, error: "Code NAF invalide : 99.99Z" });
  });

  it("refuse une date minimale postérieure à la date maximale", () => {
    const result = parse("dep=31&creeApres=2024-01-01&creeAvant=2020-01-01");
    expect(result.ok).toBe(false);
  });

  it("refuse un CA minimum supérieur au maximum", () => {
    const result = parse("caMin=5000000&caMax=1000000");
    expect(result).toEqual({
      ok: false,
      error: "Le chiffre d'affaires minimum est supérieur au maximum",
    });
  });

  it("ignore « siège dans la zone » sans localisation", () => {
    const result = parse("naf=62.01Z&siege=1");
    expect(result.ok && result.filters.siegeDansZone).toBeFalsy();
  });

  it("garde « siège dans la zone » avec une localisation", () => {
    const result = parse("region=11&siege=1");
    expect(result.ok && result.filters.siegeDansZone).toBe(true);
  });

  it("lit l'option « masquer les entreprises suivies » à part des critères", () => {
    const result = parse("naf=62.01Z&masquer=1");
    expect(result.ok && result.options).toEqual({ masquerSuivis: true });
    expect(result.ok && "masquerSuivis" in result.filters).toBe(false);
  });

  it("refuse un numéro de page invalide", () => {
    expect(parse("dep=31&page=0").ok).toBe(false);
    expect(parse("dep=31&page=abc").ok).toBe(false);
  });
});

describe("toSearchParams", () => {
  it("fait l'aller-retour avec parseSearchParams", () => {
    const query =
      "q=pain&naf=10.71C&region=11&dep=31&ville=75056&effectif=11%2C12&creeApres=2020-01-01&caMin=100000&actives=1&siege=1&masquer=1&page=3";
    const parsed = parse(query);
    if (!parsed.ok) throw new Error(parsed.error);
    const again = parse(toSearchParams(parsed.filters, parsed.page, parsed.options).toString());
    expect(again).toEqual(parsed);
  });

  it("omet la page 1", () => {
    expect(toSearchParams({ q: "x" }, 1).toString()).toBe("q=x");
  });
});
