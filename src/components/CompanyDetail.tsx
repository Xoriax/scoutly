import type { Company } from "@/domain/company";
import type { Prospect } from "@/domain/prospect";
import { libelleDepartement } from "@/data/referentiels/labels";
import { formatDate, formatEuros, formatInteger } from "@/lib/format";
import { CompanyMap } from "./CompanyMap";
import { EtatBadge, formatSiren, StatutBadge } from "./company-format";
import { ProspectEditor } from "./ProspectEditor";

/** "35600000000048" → "356 000 000 00048" */
function formatSiret(siret: string): string {
  return siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");
}

export function CompanyDetail({ company: c, prospect }: { company: Company; prospect: Prospect | null }) {
  const villeLigne = [c.codePostal, c.ville].filter(Boolean).join(" ");
  const departement = c.departement
    ? `${libelleDepartement(c.departement) ?? c.departement} (${c.departement})`
    : null;
  const etablissements =
    c.nombreEtablissementsOuverts != null
      ? `${formatInteger(c.nombreEtablissementsOuverts)} ouvert${c.nombreEtablissementsOuverts > 1 ? "s" : ""}` +
        (c.nombreEtablissements != null ? ` sur ${formatInteger(c.nombreEtablissements)}` : "")
      : null;
  const contacts = [
    c.siteWeb && { label: "Site web", value: c.siteWeb, href: c.siteWeb },
    c.telephone && { label: "Téléphone", value: c.telephone, href: `tel:${c.telephone}` },
    c.email && { label: "Email", value: c.email, href: `mailto:${c.email}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{c.nom}</h1>
          <EtatBadge etat={c.etatAdministratif} />
          {prospect && <StatutBadge statut={prospect.statut} />}
        </div>
        <p className="text-sm text-slate-600">
          SIREN <span className="font-mono">{formatSiren(c.siren)}</span>
          {c.libelleNaf && <> · {c.libelleNaf}</>}
          {c.ville && <> · {c.ville}</>}
        </p>
        {c.labels && c.labels.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Labels et certifications">
            {c.labels.map((label) => (
              <li
                key={label}
                className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
        <a
          href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${c.siren}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-medium text-indigo-700 hover:underline"
        >
          Voir sur l&apos;Annuaire des entreprises ↗
        </a>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Suivi">
          <ProspectEditor siren={c.siren} nom={c.nom} ville={c.ville} initial={prospect} />
        </Card>

        <Card title="Identité">
          <Fields
            rows={[
              ["SIREN", c.siren && <span className="font-mono">{formatSiren(c.siren)}</span>],
              ["SIRET du siège", c.siretSiege && <span className="font-mono">{formatSiret(c.siretSiege)}</span>],
              ["N° TVA", c.numeroTva && <span className="font-mono">{c.numeroTva}</span>],
              ["Forme juridique", c.formeJuridique],
              ["Catégorie", c.categorieEntreprise],
              ["Date de création", c.dateCreation && formatDate(c.dateCreation)],
              ["Date de cessation", c.dateFermeture && formatDate(c.dateFermeture)],
            ]}
          />
        </Card>

        <Card title="Activité et taille">
          <Fields
            rows={[
              ["Activité principale", c.libelleNaf],
              ["Code NAF", c.codeNaf && <span className="font-mono">{c.codeNaf}</span>],
              ["Effectif", c.trancheEffectif],
              ["Établissements", etablissements],
            ]}
          />
        </Card>

        <Card title="Siège">
          <address className="text-sm not-italic text-slate-800">
            {c.adresse || villeLigne ? (
              <>
                {c.adresse && <div>{c.adresse}</div>}
                {villeLigne && <div>{villeLigne}</div>}
                {departement && <div className="mt-1 text-slate-500">{departement}</div>}
              </>
            ) : (
              <span className="text-slate-500">Adresse non diffusible</span>
            )}
          </address>
          {c.latitude != null && c.longitude != null && (
            <div className="mt-3">
              <CompanyMap
                height="12rem"
                points={[{ siren: c.siren, nom: c.nom, latitude: c.latitude, longitude: c.longitude, detail: villeLigne }]}
              />
            </div>
          )}
        </Card>

        <Card title="Finances">
          {c.chiffreAffaires != null || c.resultatNet != null ? (
            <Fields
              rows={[
                ["Chiffre d'affaires", formatEuros(c.chiffreAffaires)],
                ["Résultat net", formatEuros(c.resultatNet)],
                ["Exercice", c.anneeFinances?.toString()],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500">Aucun compte publié.</p>
          )}
        </Card>

        {contacts.length > 0 && (
          <Card title="Contact">
            <Fields
              rows={contacts.map((contact) => [
                contact.label,
                <a key={contact.label} href={contact.href} className="text-indigo-700 hover:underline">
                  {contact.value}
                </a>,
              ])}
            />
          </Card>
        )}
      </div>

      <Card title={`Dirigeants${c.dirigeants.length > 0 ? ` (${c.dirigeants.length})` : ""}`}>
        {c.dirigeants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4">Nom</th>
                  <th scope="col" className="py-2 pr-4">Fonction</th>
                  <th scope="col" className="py-2">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {c.dirigeants.map((d, i) => (
                  <tr key={`${d.nom}-${i}`}>
                    <td className="py-2 pr-4 font-medium">{d.nom}</td>
                    <td className="py-2 pr-4">{d.fonction ?? "—"}</td>
                    <td className="py-2 text-slate-500">
                      {d.type === "personne_morale" ? "Personne morale" : "Personne physique"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun dirigeant connu.</p>
        )}
      </Card>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

/** Liste libellé / valeur ; les lignes sans valeur sont masquées */
function Fields({ rows }: { rows: [string, React.ReactNode][] }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-2 text-sm">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
