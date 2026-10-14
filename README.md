<p align="center">
  <img src="public/scoutly-logo.svg" alt="Scoutly" width="280">
</p>

<p align="center">
  Application web de prospection d'entreprises françaises : recherche multicritère,
  tableau de résultats et export Excel / CSV.
</p>

---

## Fonctionnalités

- **Recherche multicritère** : mot-clé (nom, dirigeant, adresse, SIREN), secteur d'activité,
  code NAF, localisation, tranche d'effectif, date de création, chiffre d'affaires,
  entreprises actives uniquement.
- **Localisation multiple** : villes, départements et régions combinables librement
  (« Paris, Toulouse, Gironde »), avec autocomplétion et recherche par code postal.
- **Siège situé dans la zone** : ne garde que les entreprises dont le siège est dans la zone ;
  sinon, l'établissement situé dans la zone est affiché sous l'adresse du siège.
- **Tableau paginé**, état de la recherche dans l'URL (partageable, bouton Retour fonctionnel),
  **colonnes au choix** (mémorisées dans le navigateur) et **tri** de la page affichée.
- **Carte** des sièges (OpenStreetMap), en alternative au tableau et sur chaque fiche.
- **Fiche détail** d'une entreprise : identité, TVA, activité, effectif, établissements, siège,
  finances, labels (Qualiopi, RGE, ESS…) et liste des dirigeants.
- **Export Excel / CSV** de tous les résultats (pas seulement la page affichée), avec un onglet
  récapitulant les critères. CSV compatible Excel français (`;`, UTF-8 avec BOM).
- **Cache** par requête et par SIREN, **limitation du débit** et reprise automatique
  sur erreur 429.
- **Recherches sauvegardées** : relancer une recherche en un clic.
- **Alertes « nouvelles entreprises »** : vérification planifiée des recherches surveillées et
  email récapitulatif des entreprises apparues depuis la vérification précédente.
- **Suivi des prospects** : statut (à contacter, contacté, intéressé, pas intéressé) et notes,
  modifiables depuis les résultats ou la fiche ; option pour masquer les entreprises déjà suivies.
- **Protection de l'accès** par identifiant et mot de passe (optionnelle).

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS 4
- SQLite via le module `node:sqlite` intégré à Node (aucune dépendance native)
- [Leaflet](https://leafletjs.com) + OpenStreetMap pour la carte, [Nodemailer](https://nodemailer.com) pour les emails
- [exceljs](https://github.com/exceljs/exceljs) pour l'export Excel, [zod](https://zod.dev) pour la validation
- Données : [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/docs/)
  (gratuite, sans clé) et [API Découpage administratif](https://geo.api.gouv.fr) pour les villes

Les appels aux API externes passent **uniquement par les routes serveur** (`src/app/api/`) :
le navigateur ne contacte jamais directement une source de données, ce qui permet de garder
les futures clés d'API secrètes.

## Démarrage

Prérequis : **Node.js 22.13 ou plus** (module `node:sqlite`).

```bash
npm install
cp .env.example .env.local   # puis ajuster si besoin
npm run dev
```

L'application est disponible sur <http://localhost:3000>.

| Commande        | Rôle                                   |
| --------------- | -------------------------------------- |
| `npm run dev`   | Serveur de développement               |
| `npm run build` | Build de production                    |
| `npm run start` | Lance le build de production           |
| `npm run lint`  | Vérification ESLint                    |
| `npm test`      | Tests automatisés (Vitest)             |

## Configuration

Toutes les variables sont facultatives ; les valeurs par défaut conviennent pour démarrer.

| Variable                    | Défaut                  | Rôle |
| --------------------------- | ----------------------- | ---- |
| `COMPANY_PROVIDER`          | `recherche-entreprises` | Source de données active : `recherche-entreprises` ou `pappers` |
| `API_USER_AGENT`            | `scoutly/0.1`           | User-Agent envoyé aux API (mettez un contact) |
| `RECHERCHE_ENTREPRISES_RPS` | `5`                     | Requêtes par seconde vers l'API (limite officielle : 7/s par IP) |
| `EXPORT_MAX_ROWS`           | `1000`                  | Lignes maximum par export (plafond : 10 000) |
| `EXPORT_TIMEOUT_MS`         | `90000`                 | Durée maximale de collecte d'un export |
| `BASIC_AUTH_USER`           | —                       | Identifiant d'accès ; avec `BASIC_AUTH_PASSWORD`, active la protection |
| `BASIC_AUTH_PASSWORD`       | —                       | Mot de passe d'accès |
| `DATABASE_PATH`             | `data/scoutly.db`       | Fichier SQLite (recherches sauvegardées, suivi des prospects) |
| `APP_URL`                   | —                       | Adresse publique, pour les liens des emails d'alerte |
| `ALERT_CRON_TOKEN`          | —                       | Jeton de la route de vérification planifiée des alertes |
| `ALERT_DEFAULT_EMAIL`       | —                       | Destinataire des alertes si la recherche n'en précise pas |
| `ALERT_MAX_RESULTS`         | `2000`                  | Taille maximale d'une recherche surveillée |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | — | Envoi des emails (ex. OVH : `ssl0.ovh.net`, port 465) |
| `PAPPERS_API_KEY`           | —                       | Clé de l'API Pappers (lue côté serveur uniquement) |

### Protection de l'accès

Si `BASIC_AUTH_USER` et `BASIC_AUTH_PASSWORD` sont définis, toute l'application (pages **et**
routes `/api`) demande un identifiant et un mot de passe (authentification HTTP Basic, voir
`src/proxy.ts`). Sans ces variables, l'accès est libre : pratique en développement, mais
à éviter en production, où n'importe qui pourrait consommer le quota de l'API.
Servez toujours l'application en **HTTPS** quand la protection est active.

### Alertes « nouvelles entreprises »

L'API ne sait ni filtrer ni trier par date de création : une vérification rejoue la recherche
complète et signale les entreprises **jamais vues** lors des vérifications précédentes (la
première vérification sert de référence). Une recherche surveillée doit donc rester ciblée
(`ALERT_MAX_RESULTS`).

La vérification se déclenche par un appel à `POST /api/alertes/run` avec le jeton
`ALERT_CRON_TOKEN`, par exemple chaque lundi à 8 h via la crontab du serveur :

```cron
0 8 * * 1 curl -fsS -X POST -H "Authorization: Bearer VOTRE_JETON" https://scoutly.mondomaine.fr/api/alertes/run
```

Sans configuration SMTP, aucun email ne part mais les nouveautés restent visibles sur la page
« Recherches sauvegardées », où chaque recherche peut aussi être vérifiée à la demande.

> `EXPORT_MAX_ROWS` est aussi affiché sur la page d'accueil, générée au build :
> renseignez les variables **avant** `npm run build`.

## Architecture

```
src/
├─ domain/                    Modèle métier, indépendant de toute API
│  ├─ company.ts              Company, Etablissement, Dirigeant
│  ├─ filters.ts              SearchFilters (critères génériques, codes INSEE)
│  └─ provider.ts             Interface CompanyProvider, SearchResult
├─ providers/
│  ├─ index.ts                Choix du provider selon COMPANY_PROVIDER
│  ├─ recherche-entreprises/  API de l'État : types bruts, mapper, zones, provider
│  └─ pappers/                Squelette du futur provider Pappers
├─ lib/
│  ├─ http.ts                 fetch + limitation de débit + reprise sur 429
│  ├─ cache.ts                Cache mémoire (TTL + LRU)
│  ├─ localisation.ts         Autocomplétion des villes (geo.api.gouv.fr)
│  ├─ search-params.ts        URL ⇄ SearchFilters (validation partagée client/serveur)
│  ├─ db.ts                   Base SQLite et migrations
│  ├─ prospects.ts            Suivi des prospects
│  ├─ saved-searches.ts       Recherches sauvegardées, entreprises déjà vues
│  ├─ alerts.ts, mailer.ts    Vérification des nouveautés, emails
│  └─ export/                 Colonnes, collecte paginée, génération XLSX et CSV
├─ data/referentiels/         Nomenclatures INSEE (NAF, formes juridiques, effectifs, régions…)
├─ app/
│  ├─ page.tsx                Page de recherche
│  ├─ entreprises/[siren]/    Fiche détail d'une entreprise
│  ├─ recherches/             Recherches sauvegardées et alertes
│  ├─ prospects/              Suivi des prospects
│  └─ api/                    search, companies, localisations, export, prospects,
│                             saved-searches, alertes/run
├─ components/                Formulaire, tableau, pagination, localisation, export, fiche
└─ proxy.ts                   Protection de l'accès (authentification HTTP Basic)
tests/                        Tests Vitest (filtres, zones, mapper, export, HTTP, cache, accès,
                              base de données, alertes)
```

Principe : **l'interface et l'export ne manipulent que le modèle `Company`**. Chaque provider
traduit sa source vers ce modèle ; changer de source ne touche ni l'interface ni l'export.

## Ajouter un provider (ex. Pappers)

Le squelette se trouve dans `src/providers/pappers/provider.ts` : ses méthodes lèvent
« non implémenté ». Pour le compléter :

1. **Implémenter `CompanyProvider`** (`src/domain/provider.ts`) :
   - `search(filters, page)` : traduire `SearchFilters` vers les paramètres de l'API et
     renvoyer un `SearchResult` ;
   - `getBySiren(siren)` : renvoyer la fiche, ou `null` si le SIREN est inconnu.
2. **Écrire un mapper** réponse de l'API → `Company`, sur le modèle de
   `src/providers/recherche-entreprises/mapper.ts`. Remplir les champs optionnels disponibles
   (`siteWeb`, `telephone`, `email`, `chiffreAffaires`…) : ils apparaissent automatiquement
   dans l'export (les colonnes optionnelles vides sont masquées).
3. **Gérer les critères non supportés** : un critère que l'API ne sait pas traiter doit être
   listé dans `ignoredFilters` (il est alors signalé à l'utilisateur), ou appliqué localement
   et listé dans `locallyFilteredFilters`.
4. **Réutiliser les briques communes** : `RateLimiter` et `fetchJson` (`src/lib/http.ts`),
   `TtlCache` (`src/lib/cache.ts`). Lire la clé avec `process.env.PAPPERS_API_KEY` ; le module
   importe `server-only`, la clé ne peut donc pas fuiter vers le navigateur.
5. **Enregistrer le provider** dans `src/providers/index.ts` (déjà fait pour `pappers`).
6. **Basculer** via l'environnement, puis redémarrer :

   ```
   COMPANY_PROVIDER=pappers
   PAPPERS_API_KEY=votre_cle
   ```

Testez avec une vraie clé avant de basculer en production : chaque API a ses particularités,
rarement toutes documentées.

## Particularités de l'API Recherche d'entreprises

Comportements constatés lors du développement, gérés dans
`src/providers/recherche-entreprises/` :

- **Pas de filtre sur la date de création** : appliqué localement sur chaque page reçue.
- **Les filtres géographiques portent sur tous les établissements**, pas seulement le siège.
  Le critère « siège situé dans la zone » est vérifié localement ; comme l'API classe d'abord
  les grandes entreprises multi-sites, le serveur parcourt alors plusieurs pages de l'API pour
  remplir chaque page (navigation page par page, nombre de lignes variable).
- **Les zones de types différents se cumulent (ET)** dans l'API : elles sont converties en une
  liste de communes, ou, si elle est trop longue pour l'URL (~8 000 caractères), en
  départements avec filtrage local.
- **Paris, Lyon et Marseille** doivent être interrogées par codes d'arrondissement.
- **10 000 résultats maximum** par recherche, 25 par page.
- **7 requêtes par seconde** par IP ; au-delà, réponse 429 avec `Retry-After`.
- Certaines entreprises individuelles ont une adresse non diffusible
  (`[NON-DIFFUSIBLE]`), traitée comme vide.

## Sources des données

- [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr) — DINUM, données
  INSEE (Sirene), INPI (RNE) et autres administrations
- [API Découpage administratif](https://geo.api.gouv.fr) — communes, départements, régions
- Fonds de carte © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright)
- Nomenclatures (NAF, formes juridiques, tranches d'effectif) issues du dépôt
  [annuaire-entreprises-data-gouv-fr/search-api](https://github.com/annuaire-entreprises-data-gouv-fr/search-api)
  (licence MIT)
