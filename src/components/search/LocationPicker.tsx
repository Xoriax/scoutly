"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Localisation, LocalisationType } from "@/data/referentiels/geo";

/** Noms des villes déjà vues, pour éviter de les redemander au serveur */
const communeNames = new Map<string, Localisation>();

export function rememberLocalisations(items: Localisation[]) {
  for (const item of items) if (item.type === "commune") communeNames.set(item.code, item);
}

export function knownCommune(code: string): Localisation | undefined {
  return communeNames.get(code);
}

const TYPE_LABELS: Record<LocalisationType, string> = {
  region: "Région",
  departement: "Département",
  commune: "Ville",
};

const TYPE_STYLES: Record<LocalisationType, string> = {
  region: "bg-violet-50 text-violet-700 ring-violet-200",
  departement: "bg-sky-50 text-sky-700 ring-sky-200",
  commune: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const keyOf = (l: Localisation) => `${l.type}:${l.code}`;

interface Props {
  value: Localisation[];
  onChange: (value: Localisation[]) => void;
  inputClassName: string;
}

export function LocationPicker({ value, onChange, inputClassName }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: Localisation[]; warning?: string }>({
    query: "",
    items: [],
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = query.trim();
  const loading = trimmed.length >= 2 && results.query !== trimmed;
  const selected = new Set(value.map(keyOf));
  const suggestions = results.query === trimmed ? results.items.filter((l) => !selected.has(keyOf(l))) : [];

  // Recherche avec un léger délai pour ne pas interroger le serveur à chaque frappe
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/localisations?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((body: { results?: Localisation[]; warning?: string; error?: string }) => {
          const items = body.results ?? [];
          rememberLocalisations(items);
          setResults({ query: trimmed, items, warning: body.warning ?? body.error });
          setActive(0);
        })
        .catch((error: Error) => {
          if (error.name !== "AbortError") {
            setResults({ query: trimmed, items: [], warning: "Recherche indisponible." });
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function add(item: Localisation) {
    onChange([...value, item]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(item: Localisation) {
    onChange(value.filter((l) => keyOf(l) !== keyOf(item)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && suggestions[active]) {
      // Valide la suggestion au lieu de soumettre le formulaire
      event.preventDefault();
      add(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && query === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const showList = open && trimmed.length >= 2;

  return (
    <div className="relative">
      <div
        className={`${inputClassName} flex min-h-[2.375rem] flex-wrap items-center gap-1.5 !py-1.5`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item) => (
          <span
            key={keyOf(item)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${TYPE_STYLES[item.type]}`}
          >
            <span className="sr-only">{TYPE_LABELS[item.type]} :</span>
            {item.nom}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(item);
              }}
              className="ml-0.5 rounded hover:bg-black/10"
              aria-label={`Retirer ${item.nom}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && suggestions[active] ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Ville, département, région ou code postal" : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {loading && <li className="px-3 py-2 text-slate-500">Recherche…</li>}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-slate-500">{results.warning ?? "Aucune zone trouvée"}</li>
          )}
          {!loading &&
            suggestions.map((item, i) => (
              <li
                key={keyOf(item)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 ${i === active ? "bg-indigo-50" : ""}`}
              >
                <span>
                  <span className="font-medium text-slate-900">{item.nom}</span>
                  {item.detail && item.type === "commune" && (
                    <span className="text-slate-500"> · {item.detail}</span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TYPE_STYLES[item.type]}`}
                >
                  {item.type === "departement" ? item.detail : TYPE_LABELS[item.type]}
                </span>
              </li>
            ))}
          {!loading && suggestions.length > 0 && results.warning && (
            <li className="px-3 py-2 text-xs text-amber-700">{results.warning}</li>
          )}
        </ul>
      )}
    </div>
  );
}
