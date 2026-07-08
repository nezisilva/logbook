"use client";

import { useEffect, useMemo, useState } from "react";
import { createPerson, isConfigured, listPeople } from "@/lib/db";
import type { Person } from "@/lib/types";

// Shared people-picker: chips for selected people, autocomplete from the
// shared people table, and inline creation of new names.
export default function PeoplePicker({
  selected,
  onChange,
  label = "People",
  placeholder = "Add a person…",
}: {
  selected: Person[];
  onChange: (people: Person[]) => void;
  label?: string;
  placeholder?: string;
}) {
  const [all, setAll] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPeople().then(setAll).catch(() => setAll([]));
  }, []);

  const q = query.trim();
  const suggestions = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return all
      .filter((p) => p.name.toLowerCase().includes(lower) && !selected.some((s) => s.id === p.id))
      .slice(0, 6);
  }, [q, all, selected]);

  const exactMatch = all.some((p) => p.name.toLowerCase() === q.toLowerCase());

  function add(person: Person) {
    onChange([...selected, person]);
    setQuery("");
  }

  async function createAndAdd() {
    setBusy(true);
    try {
      const person = await createPerson(q);
      setAll((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
      add(person);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {selected.length > 0 && (
        <div className="chips">
          {selected.map((p) => (
            <span key={p.id} className="chip">
              {p.name}
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onChange(selected.filter((s) => s.id !== p.id))}
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
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(suggestions.length > 0 || (q && !exactMatch && isConfigured)) && (
        <ul className="suggestions">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => add(p)}>
                {p.name}
              </button>
            </li>
          ))}
          {q && !exactMatch && isConfigured && (
            <li>
              <button type="button" disabled={busy} onClick={createAndAdd}>
                Add “{q}” as a new person
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
