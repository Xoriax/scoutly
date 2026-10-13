import "server-only";
import {
  departementOfCommune,
  departementsOfRegion,
  expandCommune,
  regionOfDepartement,
} from "@/data/referentiels/geo";
import type { Company } from "@/domain/company";
import {
  activeFilterKeys,
  matchesDateCreation,
  matchesSiegeZone,
  matchesZone,
  hasZone,
  isInZone,
  type FilterKey,
  type SearchFilters,
} from "@/domain/filters";
import { ProviderError, type CompanyProvider, type SearchResult } from "@/domain/provider";
import { globalSingleton, TtlCache } from "@/lib/cache";
import { fetchJson, RateLimiter } from "@/lib/http";
import { communesOfDepartement } from "@/lib/localisation";
import type { ApiSearchResponse } from "./api-types";
import { isUsableResult, SOURCE_NAME, toCompany } from "./mapper";

const BASE_URL = "https://recherche-entreprises.api.gouv.fr";
/** Maximum autorisé par l'API */
const PER_PAGE = 25;
/** L'API refuse les requêtes où page * per_page > 10 000 */
const MAX_RESULTS = 10_000;
const MAX_PAGE = Math.floor(MAX_RESULTS / PER_PAGE);

/**
 * Longueur maximale de la liste code_commune envoyée à l'API.
 * Au-delà d'environ 8 000 caractères d'URL, l'API répond 414 / 400.
 */
const MAX_COMMUNE_LIST_CHARS = 6_000;

const SEARCH_TTL_MS = 60 * 60 * 1000;
const SIREN_TTL_MS = 24 * 60 * 60 * 1000;

/** Critères traduits en paramètres de l'API */
const NATIVE_FILTERS: FilterKey[] = [
  "q",
  "codesNaf",
  "sectionsNaf",
  "regions",
  "departements",
  "communes",
  "tranchesEffectif",
  "chiffreAffairesMin",
  "chiffreAffairesMax",
  "activesUniquement",
];
/** Critères absents de l'API mais applicables sur chaque page reçue */
const LOCAL_FILTERS: FilterKey[] = ["dateCreationMin", "dateCreationMax", "siegeDansZone"];
const ZONE_FILTERS: FilterKey[] = ["regions", "departements", "communes"];

/** Une page brute de l'API, déjà traduite */
interface ApiPage {
  companies: Company[];
  total: number;
  /** Dernière page de l'API atteignable (plafond des 10 000 résultats inclus) */
  totalPages: number;
}

/**
 * Mode « parcours » (filtre sur le siège) : nombre maximal de pages de l'API lues
 * pour remplir une page de résultats, et pour une requête au total (saut direct de page).
 */
const MAX_API_PAGES_PER_PAGE = 10;
const MAX_API_PAGES_PER_REQUEST = 30;
/** Nombre d'établissements dans la zone renvoyés par entreprise */
const MATCHING_ETABLISSEMENTS = 5;

// Partagés entre requêtes (et préservés au rechargement à chaud)
const limiter = globalSingleton(
  "re-limiter",
  () => new RateLimiter(Number(process.env.RECHERCHE_ENTREPRISES_RPS) || 5),
);
const searchCache = globalSingleton("re-search-cache", () => new TtlCache<ApiPage>(500));
const sirenCache = globalSingleton("re-siren-cache", () => new TtlCache<Company | null>(5000));
/**
 * Mode « parcours » : pour chaque recherche, première page de l'API de chacune de nos pages
 * (starts[n] = page de l'API où commence notre page n). Permet de reprendre sans tout relire.
 */
const scanStarts = globalSingleton("re-scan-starts", () => new TtlCache<number[]>(500));

export class RechercheEntreprisesProvider implements CompanyProvider {
  readonly name = SOURCE_NAME;

  async search(filters: SearchFilters, page: number): Promise<SearchResult> {
    const active = activeFilterKeys(filters);
    const zone = await resolveZone(filters);
    const locallyFilteredFilters = active.filter(
      (k) => LOCAL_FILTERS.includes(k) || (zone.approximate && ZONE_FILTERS.includes(k)),
    );
    const ignoredFilters = active.filter(
      (k) => !NATIVE_FILTERS.includes(k) && !LOCAL_FILTERS.includes(k),
    );

    const params = toApiParams(filters, zone.params);
    if ([...params.keys()].length === 0) {
      throw new ProviderError(
        locallyFilteredFilters.length > 0
          ? "La date de création ne peut pas être le seul critère : ajoutez un mot-clé, un secteur ou une zone."
          : "Indiquez au moins un critère de recherche.",
        400,
      );
    }
    const geographic = hasZone(filters);
    params.set("per_page", String(PER_PAGE));
    // Réponse allégée ; les établissements correspondants ne servent qu'en recherche géographique
    params.set("minimal", "true");
    params.set(
      "include",
      geographic ? "siege,dirigeants,finances,matching_etablissements" : "siege,dirigeants,finances",
    );
    if (geographic) params.set("limite_matching_etablissements", String(MATCHING_ETABLISSEMENTS));

    const matches = (c: Company) =>
      matchesDateCreation(c, filters) &&
      matchesSiegeZone(c, filters) &&
      (!zone.approximate || matchesZone(c, filters));
    // Zone élargie envoyée à l'API : on ne garde que les établissements réellement dans la zone
    const keep = (c: Company) => matches(c);
    const clean = (c: Company): Company =>
      zone.approximate && c.etablissementsDansZone
        ? { ...c, etablissementsDansZone: c.etablissementsDansZone.filter((e) => isInZone(e, filters)) }
        : c;
    const common = {
      perPage: PER_PAGE,
      totalIsApproximate: locallyFilteredFilters.length > 0,
      ignoredFilters,
      locallyFilteredFilters,
    };

    // La zone ne peut être vérifiée que sur le siège, après coup : sans parcours,
    // la plupart des pages seraient presque vides (l'API classe d'abord les grandes entreprises).
    const scan = zone.approximate || (filters.siegeDansZone === true && geographic);

    if (!scan) {
      if (page > MAX_PAGE) throw tooFar();
      const raw = await this.fetchPage(params, page, geographic);
      return {
        ...common,
        companies: (locallyFilteredFilters.length > 0 ? raw.companies.filter(keep) : raw.companies).map(clean),
        page,
        total: raw.total,
        totalPages: raw.totalPages,
        hasNextPage: page < raw.totalPages,
        scanned: false,
      };
    }

    // Mode parcours : on lit les pages de l'API jusqu'à remplir notre page
    const key = params.toString();
    const starts = [...((await scanStarts.get(key)) ?? [0, 1])];
    let known = Math.min(page, starts.length - 1);
    let budget = MAX_API_PAGES_PER_REQUEST;
    let total = 0;
    let lastApiPage = MAX_PAGE;

    for (;;) {
      const companies: Company[] = [];
      let apiPage = starts[known];
      let read = 0;
      while (
        apiPage <= lastApiPage &&
        companies.length < PER_PAGE &&
        read < MAX_API_PAGES_PER_PAGE
      ) {
        if (budget-- <= 0) {
          throw new ProviderError(
            "Page trop éloignée pour être calculée d'un coup : avancez page par page.",
            400,
          );
        }
        const raw = await this.fetchPage(params, apiPage, geographic);
        total = raw.total;
        lastApiPage = raw.totalPages;
        companies.push(...raw.companies.filter(keep).map(clean));
        apiPage++;
        read++;
      }
      starts[known + 1] = apiPage;
      scanStarts.set(key, starts, SEARCH_TTL_MS);

      const hasNextPage = apiPage <= lastApiPage;
      if (known === page || !hasNextPage) {
        return {
          ...common,
          companies: known === page ? companies : [],
          page,
          total,
          totalPages: null,
          hasNextPage: known === page && hasNextPage,
          scanned: true,
        };
      }
      known++;
    }
  }

  /** Lit une page de l'API (avec cache) */
  private fetchPage(base: URLSearchParams, page: number, withEtablissements: boolean): Promise<ApiPage> {
    const params = new URLSearchParams(base);
    params.set("page", String(page));
    const url = `${BASE_URL}/search?${params}`;
    return searchCache.getOrLoad(url, SEARCH_TTL_MS, async () => {
      const data = await this.fetch<ApiSearchResponse>(url);
      const companies = data.results
        .filter(isUsableResult)
        .map((r) => toCompany(r, withEtablissements));
      // Les résultats de recherche alimentent aussi le cache par SIREN,
      // sans les établissements propres à cette recherche
      for (const company of companies) {
        if (!sirenCache.get(company.siren)) {
          const { etablissementsDansZone, ...fiche } = company;
          sirenCache.set(company.siren, fiche, SIREN_TTL_MS);
        }
      }
      return {
        companies,
        total: data.total_results,
        totalPages: Math.min(data.total_pages, MAX_PAGE),
      };
    });
  }

  async getBySiren(siren: string): Promise<Company | null> {
    if (!/^\d{9}$/.test(siren)) {
      throw new ProviderError("Le SIREN doit comporter 9 chiffres.", 400);
    }
    // Pas d'endpoint dédié : on recherche le SIREN et on garde la correspondance exacte
    return sirenCache.getOrLoad(siren, SIREN_TTL_MS, async () => {
      const params = new URLSearchParams({
        q: siren,
        per_page: "5",
        minimal: "true",
        include: "siege,dirigeants,finances",
      });
      const data = await this.fetch<ApiSearchResponse>(`${BASE_URL}/search?${params}`);
      const match = data.results.find((r) => r.siren === siren && isUsableResult(r));
      return match ? toCompany(match) : null;
    });
  }

  private fetch<T>(url: string): Promise<T> {
    return fetchJson<T>(url, {
      limiter,
      headers: { "User-Agent": process.env.API_USER_AGENT || "scoutly/0.1" },
    });
  }
}

function tooFar(): ProviderError {
  return new ProviderError(
    `Cette source ne permet pas d'aller au-delà des ${MAX_RESULTS} premiers résultats. Affinez la recherche.`,
    400,
  );
}

function toApiParams(filters: SearchFilters, zone: Record<string, string[]>): URLSearchParams {
  const params = new URLSearchParams();
  const setList = (name: string, values?: string[]) => {
    if (values?.length) params.set(name, values.join(","));
  };
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  setList("activite_principale", filters.codesNaf);
  setList("section_activite_principale", filters.sectionsNaf);
  for (const [name, values] of Object.entries(zone)) setList(name, values);
  setList("tranche_effectif_salarie", filters.tranchesEffectif);
  if (filters.chiffreAffairesMin !== undefined) params.set("ca_min", String(filters.chiffreAffairesMin));
  if (filters.chiffreAffairesMax !== undefined) params.set("ca_max", String(filters.chiffreAffairesMax));
  if (filters.activesUniquement) params.set("etat_administratif", "A");
  return params;
}

interface ResolvedZone {
  params: Record<string, string[]>;
  /** Vrai si la zone envoyée à l'API est plus large que demandé : filtrage local sur le siège */
  approximate: boolean;
}

/**
 * Les paramètres region / departement / code_commune de l'API se cumulent (ET),
 * alors que SearchFilters demande « dans l'une des zones » (OU).
 * On ramène donc toute la zone à un seul paramètre :
 * 1. les zones couvertes par une zone plus large sont retirées (Toulouse + Haute-Garonne → 31) ;
 * 2. une seule sorte de zone → paramètre natif (régions + départements → départements) ;
 * 3. villes + départements/régions → liste de communes, si elle tient dans l'URL (résultat exact) ;
 * 4. sinon → départements couvrant toutes les zones, puis filtrage local sur le siège.
 */
async function resolveZone(filters: SearchFilters): Promise<ResolvedZone> {
  const regions = filters.regions ?? [];
  const inRegions = (dep: string) => regions.includes(regionOfDepartement(dep) ?? "");
  const departements = (filters.departements ?? []).filter((d) => !inRegions(d));
  const communes = (filters.communes ?? []).filter((c) => {
    const dep = departementOfCommune(c);
    return !departements.includes(dep) && !inRegions(dep);
  });
  const coveringDeps = [...regions.flatMap(departementsOfRegion), ...departements];

  if (communes.length === 0) {
    if (regions.length > 0 && departements.length > 0) {
      return { params: { departement: coveringDeps }, approximate: false };
    }
    if (regions.length > 0) return { params: { region: regions }, approximate: false };
    if (departements.length > 0) return { params: { departement: departements }, approximate: false };
    return { params: {}, approximate: false };
  }
  if (coveringDeps.length === 0) {
    return { params: { code_commune: communes.flatMap(expandCommune) }, approximate: false };
  }

  try {
    const lists = await Promise.all(coveringDeps.map(communesOfDepartement));
    const all = [...new Set([...lists.flat(), ...communes].flatMap(expandCommune))];
    if (all.join(",").length <= MAX_COMMUNE_LIST_CHARS) {
      return { params: { code_commune: all }, approximate: false };
    }
  } catch {
    // Référentiel des communes indisponible : on passe au repli
  }
  const deps = new Set([...coveringDeps, ...communes.map(departementOfCommune)]);
  return { params: { departement: [...deps] }, approximate: true };
}
