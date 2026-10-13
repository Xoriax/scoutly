import "server-only";
import {
  normalizeText,
  searchRegionsEtDepartements,
  type Localisation,
} from "@/data/referentiels/geo";
import { libelleDepartement } from "@/data/referentiels/labels";
import { globalSingleton, TtlCache } from "./cache";
import { fetchJson, RateLimiter } from "./http";

/**
 * Autocomplétion des zones géographiques.
 * Régions et départements : référentiel local. Villes : API Découpage administratif
 * (https://geo.api.gouv.fr), appelée uniquement côté serveur.
 */

const GEO_URL = "https://geo.api.gouv.fr";
const TTL_MS = 24 * 60 * 60 * 1000;

interface GeoCommune {
  nom: string;
  code: string;
  codeDepartement: string;
  population?: number;
}

const limiter = globalSingleton("geo-limiter", () => new RateLimiter(10));
const cache = globalSingleton("geo-cache", () => new TtlCache<GeoCommune[]>(2000));

function fetchGeo(path: string): Promise<GeoCommune[]> {
  return cache.getOrLoad(path, TTL_MS, () =>
    fetchJson<GeoCommune[] | GeoCommune>(`${GEO_URL}${path}`, {
      limiter,
      maxRetries: 1,
      timeoutMs: 5000,
    }).then((data) => (Array.isArray(data) ? data : [data])),
  );
}

function toLocalisation(c: GeoCommune): Localisation {
  const dep = libelleDepartement(c.codeDepartement);
  return {
    type: "commune",
    code: c.code,
    nom: c.nom,
    detail: dep ? `${dep} (${c.codeDepartement})` : c.codeDepartement,
  };
}

export interface LocalisationSearch {
  results: Localisation[];
  /** Renseigné si la recherche de villes a échoué (résultats partiels) */
  warning?: string;
}

export async function searchLocalisations(rawQuery: string): Promise<LocalisationSearch> {
  const query = rawQuery.trim();
  if (query.length < 2) return { results: [] };

  const fields = "fields=nom,code,codeDepartement,population";
  // Un code postal (ex. 31000) renvoie les villes qui le portent
  const isPostalCode = /^\d{5}$/.test(query);
  const path = isPostalCode
    ? `/communes?codePostal=${query}&${fields}`
    : `/communes?nom=${encodeURIComponent(query)}&${fields}&boost=population&limit=6`;

  const local = isPostalCode ? [] : searchRegionsEtDepartements(query);
  let communes: Localisation[] = [];
  let warning: string | undefined;
  try {
    communes = (await fetchGeo(path))
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .map(toLocalisation);
  } catch {
    warning = "La recherche de villes est momentanément indisponible.";
  }

  // Correspondances exactes d'abord, la ville avant le département homonyme ("Paris"),
  // puis régions, départements, villes
  const normalized = normalizeText(query);
  const all = [...local, ...communes];
  const rank = { commune: 0, departement: 1, region: 2 } as const;
  const exact = all
    .filter((l) => normalizeText(l.nom) === normalized)
    .sort((a, b) => rank[a.type] - rank[b.type]);
  const rest = all.filter((l) => !exact.includes(l));
  return { results: [...exact, ...rest].slice(0, 10), warning };
}

/** Codes INSEE de toutes les communes d'un département */
export async function communesOfDepartement(departement: string): Promise<string[]> {
  const communes = await fetchGeo(`/departements/${departement}/communes?fields=code`);
  return communes.map((c) => c.code);
}

/** Noms des villes à partir de leurs codes INSEE (pour réafficher une recherche depuis l'URL) */
export async function resolveCommunes(codes: string[]): Promise<Localisation[]> {
  const settled = await Promise.allSettled(
    codes.map((code) => fetchGeo(`/communes/${code}?fields=nom,code,codeDepartement`)),
  );
  return settled.flatMap((r, i) =>
    r.status === "fulfilled" && r.value[0]
      ? [toLocalisation(r.value[0])]
      : [{ type: "commune" as const, code: codes[i], nom: codes[i] }],
  );
}
