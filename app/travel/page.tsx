"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WorldMap from "@/components/WorldMap";
import StatusPicker from "@/components/StatusPicker";
import { isConfigured, listTrips, type TripFull } from "@/lib/db";
import { CONTINENTS, CONTINENT_TOTALS, COUNTRY_BY_CODE, TOTAL_COUNTRIES } from "@/lib/countries";

function tripCountryCodes(trip: TripFull): string[] {
  return [
    ...new Set(
      trip.entry_places
        .map((ep) => ep.places.country_code)
        .filter((c): c is string => Boolean(c))
    ),
  ];
}

export default function Travel() {
  const [trips, setTrips] = useState<TripFull[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("done");

  useEffect(() => {
    listTrips()
      .then(setTrips)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }, []);

  const doneTrips = useMemo(() => trips.filter((t) => t.status === "done"), [trips]);

  const visited = useMemo(
    () => new Set(doneTrips.flatMap(tripCountryCodes)),
    [doneTrips]
  );

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const thisYear = new Set(
      doneTrips
        .filter((t) => t.entry_dates.some((d) => d.date.startsWith(String(year))))
        .flatMap(tripCountryCodes)
    );
    const continents = new Set(
      [...visited].map((code) => COUNTRY_BY_CODE[code]?.continent).filter(Boolean)
    );
    return { thisYear: thisYear.size, continents: continents.size };
  }, [doneTrips, visited]);

  const byContinent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const code of visited) {
      const cont = COUNTRY_BY_CODE[code]?.continent;
      if (cont) counts.set(cont, (counts.get(cont) ?? 0) + 1);
    }
    return counts;
  }, [visited]);

  const shownTrips = trips.filter((t) => t.status === tab);

  return (
    <>
      <h1>Travel</h1>
      <WorldMap visited={visited} />

      <div className="statgrid">
        <div className="stat">
          <strong>{visited.size}</strong>
          <span>countries</span>
        </div>
        <div className="stat">
          <strong>{((visited.size / TOTAL_COUNTRIES) * 100).toFixed(1)}%</strong>
          <span>of {TOTAL_COUNTRIES}</span>
        </div>
        <div className="stat">
          <strong>{stats.continents}</strong>
          <span>continents</span>
        </div>
        <div className="stat">
          <strong>{stats.thisYear}</strong>
          <span>this year</span>
        </div>
      </div>

      <div className="contbars">
        {CONTINENTS.map((cont) => {
          const n = byContinent.get(cont) ?? 0;
          const total = CONTINENT_TOTALS[cont];
          return (
            <div key={cont} className="contbar">
              <span className="contbar-label">{cont}</span>
              <span className="contbar-track">
                <span className="contbar-fill" style={{ width: `${(n / total) * 100}%` }} />
              </span>
              <span className="contbar-count muted">
                {n}/{total}
              </span>
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <h2>Trips</h2>
        <Link href="/travel/trip/new" className="btn">
          Add trip
        </Link>
      </div>
      <StatusPicker
        label=""
        options={[
          { value: "done", label: "Been" },
          { value: "wishlist", label: "Planned" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error && <p className="error-text">{error}</p>}
      {!isConfigured && (
        <p className="muted">Trips need Supabase configured — the map and stats work once it is.</p>
      )}
      {isConfigured && loaded && shownTrips.length === 0 && (
        <p className="muted">
          {tab === "done" ? "No trips yet — add your first!" : "No planned trips yet."}
        </p>
      )}
      <ul className="itemlist">
        {shownTrips.map((t) => (
          <li key={t.id}>
            <Link href={`/travel/trip/${t.id}`}>
              <strong>{t.title}</strong>
              <span className="muted">
                {tripCountryCodes(t)
                  .map((c) => COUNTRY_BY_CODE[c]?.name ?? c)
                  .join(", ")}
                {t.entry_dates.length > 0 && ` · ${t.entry_dates[0].date}`}
                {t.rating ? ` · ${"★".repeat(Math.round(t.rating / 2))}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
