"use client";

import { useEffect, useState, type FormEvent } from "react";
import { hasZone as filtersHaveZone, type SearchFilters } from "@/domain/filters";
import {
  NAF_OPTIONS,
  SECTION_OPTIONS,
  TRANCHE_OPTIONS,
  TRANCHE_ORDER,
} from "@/data/referentiels/labels";
import { localLocalisation, type Localisation } from "@/data/referentiels/geo";
import { formatEuros } from "@/lib/format";
import { PARAM, parseSearchParams } from "@/lib/search-params";
import { knownCommune, LocationPicker, rememberLocalisations } from "./LocationPicker";

interface FormState {
  q: string;
  secteur: string;
  naf: string;
  localisations: Localisation[];
  effectifMin: string;
  effectifMax: string;
  creeApres: string;
  creeAvant: string;
  caMin: string;
  caMax: string;
  actives: boolean;
  siege: boolean;
}

/** Paliers proposés pour le chiffre d'affaires (en euros) */
const CA_PALIERS = [
  100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000,
  50_000_000, 100_000_000, 500_000_000, 1_000_000_000,
];

function toLocalisations(filters: SearchFilters | null): Localisation[] {
  if (!filters) return [];
  return [
    ...(filters.regions ?? []).map((code) => localLocalisation("region", code)),
    ...(filters.departements ?? []).map((code) => localLocalisation("departement", code)),
    // Nom provisoire = code, complété par le serveur si la ville n'est pas encore connue
    ...(filters.communes ?? []).map(
      (code) => knownCommune(code) ?? { type: "commune" as const, code, nom: code },
    ),
  ].filter((l): l is Localisation => l !== null);
}

function toFormState(filters: SearchFilters | null): FormState {
  const tranches = filters?.tranchesEffectif ?? [];
  return {
    q: filters?.q ?? "",
    secteur: filters?.sectionsNaf?.[0] ?? "",
    naf: filters?.codesNaf?.join(", ") ?? "",
    localisations: toLocalisations(filters),
    effectifMin: tranches[0] ?? "",
    effectifMax: tranches.at(-1) ?? "",
    creeApres: filters?.dateCreationMin ?? "",
    creeAvant: filters?.dateCreationMax ?? "",
    caMin: filters?.chiffreAffairesMin?.toString() ?? "",
    caMax: filters?.chiffreAffairesMax?.toString() ?? "",
    // Première visite : on propose les entreprises actives par défaut
    actives: filters ? Boolean(filters.activesUniquement) : true,
    // Par défaut on cherche les entreprises dont le siège est dans la zone
    siege: filters ? Boolean(filters.siegeDansZone) : true,
  };
}

/** Tranches comprises entre min et max inclus (bornes facultatives) */
function trancheRange(min: string, max: string): string[] {
  if (!min && !max) return [];
  const start = min ? TRANCHE_ORDER.indexOf(min as (typeof TRANCHE_ORDER)[number]) : 0;
  const end = max
    ? TRANCHE_ORDER.indexOf(max as (typeof TRANCHE_ORDER)[number])
    : TRANCHE_ORDER.length - 1;
  return TRANCHE_ORDER.slice(Math.min(start, end), Math.max(start, end) + 1);
}

interface Props {
  /** Filtres de la recherche en cours (null si aucune recherche) */
  initialFilters: SearchFilters | null;
  onSubmit: (filters: SearchFilters) => void;
}

export function SearchForm({ initialFilters, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialFilters));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const hasZone = form.localisations.length > 0;

  // Recherche rouverte depuis une URL : on récupère le nom des villes inconnues
  useEffect(() => {
    const unknown = form.localisations.filter((l) => l.type === "commune" && l.nom === l.code);
    if (unknown.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/localisations?villes=${unknown.map((l) => l.code).join(",")}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((body: { results?: Localisation[] }) => {
        const resolved = body.results ?? [];
        rememberLocalisations(resolved);
        setForm((f) => ({
          ...f,
          localisations: f.localisations.map(
            (l) => resolved.find((r) => r.type === l.type && r.code === l.code) ?? l,
          ),
        }));
      })
      .catch(() => {});
    return () => controller.abort();
    // Uniquement au montage : les ajouts ultérieurs ont déjà leur nom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Même validation que côté serveur
    const params = new URLSearchParams();
    const put = (name: string, value: string) => {
      if (value.trim()) params.set(name, value.trim());
    };
    const codes = (type: Localisation["type"]) =>
      form.localisations
        .filter((l) => l.type === type)
        .map((l) => l.code)
        .join(",");
    put(PARAM.q, form.q);
    put(PARAM.sectionsNaf, form.secteur);
    put(PARAM.codesNaf, form.naf);
    put(PARAM.regions, codes("region"));
    put(PARAM.departements, codes("departement"));
    put(PARAM.communes, codes("commune"));
    put(PARAM.tranchesEffectif, trancheRange(form.effectifMin, form.effectifMax).join(","));
    put(PARAM.dateCreationMin, form.creeApres);
    put(PARAM.dateCreationMax, form.creeAvant);
    put(PARAM.chiffreAffairesMin, form.caMin);
    put(PARAM.chiffreAffairesMax, form.caMax);
    if (form.actives) params.set(PARAM.activesUniquement, "1");
    if (form.siege && hasZone) params.set(PARAM.siegeDansZone, "1");

    const parsed = parseSearchParams(params);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const { filters } = parsed;
    const hasCriterion =
      filters.q ||
      filters.codesNaf ||
      filters.sectionsNaf ||
      filtersHaveZone(filters) ||
      filters.tranchesEffectif ||
      filters.chiffreAffairesMin !== undefined ||
      filters.chiffreAffairesMax !== undefined;
    if (!hasCriterion) {
      setError(
        "Indiquez au moins un mot-clé, un secteur, un code NAF, une localisation, un effectif ou un chiffre d'affaires.",
      );
      return;
    }
    setError(null);
    onSubmit(filters);
  }

  function handleReset() {
    setForm(toFormState(null));
    setError(null);
  }

  /** Paliers + valeur éventuellement saisie à la main dans l'URL */
  const caOptions = [
    ...new Set([...CA_PALIERS, ...[form.caMin, form.caMax].filter(Boolean).map(Number)]),
  ].sort((a, b) => a - b);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Mot-clé" className="sm:col-span-2" hint="Nom, dirigeant, adresse, SIREN…">
          <input
            type="search"
            value={form.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="ex. boulangerie, Dupont, 356000000"
            className={inputClass}
          />
        </Field>

        <Field label="Secteur d'activité">
          <select
            value={form.secteur}
            onChange={(e) => set("secteur", e.target.value)}
            className={inputClass}
          >
            <option value="">Tous les secteurs</option>
            {SECTION_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} – {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Code NAF" hint="Un ou plusieurs, séparés par des virgules">
          <input
            list="naf-options"
            value={form.naf}
            onChange={(e) => set("naf", e.target.value)}
            placeholder="ex. 62.01Z"
            className={inputClass}
          />
          <datalist id="naf-options">
            {NAF_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </datalist>
        </Field>

        <Field
          label="Localisation"
          className="sm:col-span-2"
          hint="Ajoutez autant de zones que nécessaire, même de types différents : Paris, Toulouse, Île-de-France, Gironde, 31000…"
        >
          <LocationPicker
            value={form.localisations}
            onChange={(v) => set("localisations", v)}
            inputClassName={inputClass}
          />
        </Field>

        <Field label="Effectif minimum">
          <select
            value={form.effectifMin}
            onChange={(e) => set("effectifMin", e.target.value)}
            className={inputClass}
          >
            <option value="">Indifférent</option>
            {TRANCHE_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {shortTranche(o.label)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Effectif maximum">
          <select
            value={form.effectifMax}
            onChange={(e) => set("effectifMax", e.target.value)}
            className={inputClass}
          >
            <option value="">Indifférent</option>
            {TRANCHE_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {shortTranche(o.label)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Créée après le">
          <input
            type="date"
            value={form.creeApres}
            onChange={(e) => set("creeApres", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Créée avant le">
          <input
            type="date"
            value={form.creeAvant}
            onChange={(e) => set("creeAvant", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="CA minimum">
          <select
            value={form.caMin}
            onChange={(e) => set("caMin", e.target.value)}
            className={inputClass}
          >
            <option value="">Indifférent</option>
            {caOptions.map((v) => (
              <option key={v} value={v}>
                {formatEuros(v, true)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="CA maximum">
          <select
            value={form.caMax}
            onChange={(e) => set("caMax", e.target.value)}
            className={inputClass}
          >
            <option value="">Indifférent</option>
            {caOptions.map((v) => (
              <option key={v} value={v}>
                {formatEuros(v, true)}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-4">
          <Checkbox
            checked={form.actives}
            onChange={(v) => set("actives", v)}
            label="Entreprises actives uniquement"
          />
          <Checkbox
            checked={form.siege && hasZone}
            disabled={!hasZone}
            onChange={(v) => set("siege", v)}
            label="Siège situé dans la zone"
            hint={
              hasZone
                ? "Sinon, une entreprise ressort dès qu'un de ses établissements est dans la zone."
                : "Renseignez une localisation."
            }
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

/** "Unité non employeuse (pas de salarié…)" → "Unité non employeuse" */
function shortTranche(label: string): string {
  return label.replace(/\s*\(.*\)\s*$/, "");
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-sm text-slate-700">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
