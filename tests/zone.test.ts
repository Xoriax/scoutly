import { beforeEach, describe, expect, it, vi } from "vitest";

// Le référentiel des communes vient de geo.api.gouv.fr : simulé ici
const communesOfDepartement = vi.fn<(dep: string) => Promise<string[]>>();
vi.mock("@/lib/localisation", () => ({ communesOfDepartement }));

const { resolveZone } = await import("@/providers/recherche-entreprises/zone");

const fakeCommunes = (dep: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${dep}${String(i + 1).padStart(3, "0")}`);

beforeEach(() => {
  communesOfDepartement.mockReset();
  communesOfDepartement.mockImplementation(async (dep) => fakeCommunes(dep, 3));
});

describe("resolveZone", () => {
  it("sans zone : aucun paramètre", async () => {
    expect(await resolveZone({ q: "x" })).toEqual({ params: {}, approximate: false });
  });

  it("une seule sorte de zone : paramètre natif", async () => {
    expect(await resolveZone({ regions: ["11"] })).toEqual({
      params: { region: ["11"] },
      approximate: false,
    });
    expect(await resolveZone({ departements: ["31", "33"] })).toEqual({
      params: { departement: ["31", "33"] },
      approximate: false,
    });
  });

  it("Paris, Lyon et Marseille : codes d'arrondissement", async () => {
    const { params } = await resolveZone({ communes: ["75056", "31555"] });
    expect(params.code_commune).toHaveLength(21);
    expect(params.code_commune).toContain("75101");
    expect(params.code_commune).toContain("75120");
    expect(params.code_commune).not.toContain("75056");
    expect(params.code_commune).toContain("31555");
  });

  it("retire une ville déjà couverte par son département", async () => {
    expect(await resolveZone({ departements: ["31"], communes: ["31555"] })).toEqual({
      params: { departement: ["31"] },
      approximate: false,
    });
  });

  it("retire un département déjà couvert par sa région", async () => {
    // Haute-Garonne (31) appartient à l'Occitanie (76)
    expect(await resolveZone({ regions: ["76"], departements: ["31"] })).toEqual({
      params: { region: ["76"] },
      approximate: false,
    });
  });

  it("région + département distincts : liste de départements", async () => {
    const { params, approximate } = await resolveZone({ regions: ["94"], departements: ["31"] });
    expect(approximate).toBe(false);
    // Corse (94) : 2A et 2B
    expect(params.departement?.sort()).toEqual(["2A", "2B", "31"]);
  });

  it("ville + département distincts : liste de communes exacte", async () => {
    const result = await resolveZone({ departements: ["33"], communes: ["31555"] });
    expect(communesOfDepartement).toHaveBeenCalledWith("33");
    expect(result).toEqual({
      params: { code_commune: ["33001", "33002", "33003", "31555"] },
      approximate: false,
    });
  });

  it("liste trop longue pour l'URL : départements + filtrage local", async () => {
    communesOfDepartement.mockImplementation(async (dep) => fakeCommunes(dep, 1500));
    const result = await resolveZone({ departements: ["33"], communes: ["31555"] });
    expect(result.approximate).toBe(true);
    expect(result.params.departement?.sort()).toEqual(["31", "33"]);
  });

  it("référentiel des communes indisponible : repli sur les départements", async () => {
    communesOfDepartement.mockRejectedValue(new Error("504"));
    const result = await resolveZone({ departements: ["33"], communes: ["31555"] });
    expect(result).toEqual({ params: { departement: ["33", "31"] }, approximate: true });
  });
});
