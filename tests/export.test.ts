import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { Company } from "@/domain/company";
import { columnsFor } from "@/lib/export/columns";
import { buildCsv } from "@/lib/export/csv";
import { buildXlsx } from "@/lib/export/xlsx";

const company = (overrides: Partial<Company> = {}): Company => ({
  siren: "123456789",
  siretSiege: "12345678900011",
  nom: 'BOULANGERIE "CHEZ PAUL"; SAS',
  formeJuridiqueCode: "5710",
  formeJuridique: "SAS, société par actions simplifiée",
  adresse: "1 RUE DU PAIN",
  codePostal: "31000",
  ville: "TOULOUSE",
  codeCommune: "31555",
  departement: "31",
  codeNaf: "10.71C",
  libelleNaf: "Boulangerie et boulangerie-pâtisserie",
  dateCreation: "2021-03-15",
  trancheEffectifCode: "NN",
  trancheEffectif: "Unité non employeuse (pas de salarié au cours de l'année)",
  categorieEntreprise: "PME",
  etatAdministratif: "active",
  dirigeants: [{ nom: "PAUL MARTIN", fonction: "Président", type: "personne_physique" }],
  chiffreAffaires: 250000,
  source: "test",
  ...overrides,
});

describe("columnsFor", () => {
  it("masque les colonnes optionnelles vides", () => {
    const headers = columnsFor([company()]).map((c) => c.header);
    expect(headers).toContain("Chiffre d'affaires (€)");
    expect(headers).not.toContain("Site web");
    expect(headers).not.toContain("Établissement dans la zone");
  });

  it("affiche une colonne optionnelle dès qu'une ligne a une valeur", () => {
    const headers = columnsFor([company(), company({ siteWeb: "https://exemple.fr" })]).map(
      (c) => c.header,
    );
    expect(headers).toContain("Site web");
  });
});

describe("buildCsv", () => {
  const csv = buildCsv([company()]);
  const [header, row] = csv.slice(1).split("\r\n");

  it("commence par le BOM UTF-8 et utilise CRLF", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("sépare par des points-virgules", () => {
    expect(header.startsWith("SIREN;SIRET du siège;")).toBe(true);
  });

  it("échappe guillemets et points-virgules", () => {
    expect(row).toContain('"BOULANGERIE ""CHEZ PAUL""; SAS"');
  });

  it("formate les dates en JJ/MM/AAAA et abrège l'effectif", () => {
    expect(row).toContain(";15/03/2021;");
    expect(row).toContain(";Unité non employeuse;");
  });
});

describe("buildXlsx", () => {
  it("produit deux onglets avec des cellules typées", async () => {
    const buffer = await buildXlsx([company()], {
      info: [["Mot-clé", "boulangerie"]],
      warnings: ["Export limité"],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Entreprises", "Recherche"]);
    const sheet = workbook.getWorksheet("Entreprises")!;
    const headers = sheet.getRow(1).values as string[];
    const cell = (header: string) => sheet.getRow(2).getCell(headers.indexOf(header));

    expect(cell("SIREN").value).toBe("123456789");
    expect(cell("Date de création").value).toEqual(new Date(Date.UTC(2021, 2, 15)));
    expect(cell("Chiffre d'affaires (€)").value).toBe(250000);

    const recap = workbook.getWorksheet("Recherche")!;
    const lines = recap.getSheetValues().flat().filter(Boolean);
    expect(lines).toContain("boulangerie");
    expect(lines).toContain("Export limité");
  });
});
