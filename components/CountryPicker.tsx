"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/countries";

// Chips + autocomplete over the static 195-country list. Values are alpha-2 codes.
export default function CountryPicker({
  selected,
  onChange,
  label = "Countries",
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!q) return [];
    return COUNTRIES.filter(
      (c) =>
        (c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) &&
        !selected.includes(c.code)
    ).slice(0, 6);
  }, [q, selected]);

  return (
    <div className="field">
      <label>{label}</label>
      {selected.length > 0 && (
        <div className="chips">
          {selected.map((code) => (
            <span key={code} className="chip">
              {COUNTRY_BY_CODE[code]?.name ?? code}
              <button
                type="button"
                aria-label={`Remove ${COUNTRY_BY_CODE[code]?.name ?? code}`}
                onClick={() => onChange(selected.filter((s) => s !== code))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="textfield"
        placeholder="Add a country…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, c.code]);
                  setQuery("");
                }}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
