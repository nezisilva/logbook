"use client";

import { useEffect, useMemo, useState } from "react";
import { createCity, ensureCountryPlace, isConfigured } from "@/lib/db";
import { listAllCities } from "@/lib/concerts";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/countries";
import type { Place } from "@/lib/types";

// Single-city picker over the shared places table, with inline creation
// (new cities need a country so they tie into Travel).
export default function CityPicker({
  value,
  onChange,
  label = "City",
}: {
  value: Place | null;
  onChange: (city: Place | null) => void;
  label?: string;
}) {
  const [cities, setCities] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listAllCities().then(setCities).catch(() => setCities([]));
  }, []);

  const q = query.trim();
  const suggestions = useMemo(() => {
    if (!q || value) return [];
    const lower = q.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 6);
  }, [q, cities, value]);

  const countryMatches = useMemo(() => {
    const lower = countryQuery.trim().toLowerCase();
    if (!lower) return [];
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 6);
  }, [countryQuery]);

  async function createIn(countryCode: string) {
    setBusy(true);
    try {
      const countryPlace = await ensureCountryPlace(
        countryCode,
        COUNTRY_BY_CODE[countryCode].name
      );
      const city = await createCity(q, countryPlace);
      setCities((prev) => [...prev, city].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(city);
      setQuery("");
      setCountryQuery("");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="chips">
          <span className="chip">
            {value.name}
            {value.country_code && (
              <span className="muted"> ({COUNTRY_BY_CODE[value.country_code]?.name})</span>
            )}
            <button type="button" aria-label="Remove city" onClick={() => onChange(null)}>
              ×
            </button>
          </span>
        </div>
      ) : (
        <>
          <input
            type="text"
            className="textfield"
            placeholder="Add a city…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCreating(false);
            }}
          />
          {(suggestions.length > 0 || (q && isConfigured)) && (
            <ul className="suggestions">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onChange(c)}>
                    {c.name}
                    {c.country_code && (
                      <span className="muted"> ({COUNTRY_BY_CODE[c.country_code]?.name})</span>
                    )}
                  </button>
                </li>
              ))}
              {q && isConfigured && !creating && (
                <li>
                  <button type="button" onClick={() => setCreating(true)}>
                    Add “{q}” as a new city…
                  </button>
                </li>
              )}
            </ul>
          )}
          {creating && (
            <>
              <input
                type="text"
                className="textfield"
                placeholder="Which country is it in?"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                autoFocus
              />
              {countryMatches.length > 0 && (
                <ul className="suggestions">
                  {countryMatches.map((c) => (
                    <li key={c.code}>
                      <button type="button" disabled={busy} onClick={() => createIn(c.code)}>
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
