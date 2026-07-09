"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createCity,
  deletePlace,
  ensureCountryPlace,
  getCountryPlace,
  isConfigured,
  listCities,
  listTrips,
  updatePlaceDetails,
  type TripFull,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { COUNTRY_BY_CODE } from "@/lib/countries";
import type { Place } from "@/lib/types";

export default function CountryPage() {
  const { code } = useParams<{ code: string }>();
  const country = COUNTRY_BY_CODE[code?.toUpperCase() ?? ""];

  const [trips, setTrips] = useState<TripFull[]>([]);
  const [cities, setCities] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [newCity, setNewCity] = useState("");
  const [bestTime, setBestTime] = useState<string>("");
  const [editingBestTime, setEditingBestTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!country) return;
    Promise.all([listTrips(), listCities(country.code), getCountryPlace(country.code)])
      .then(([allTrips, cityRows, placeRow]) => {
        setTrips(
          allTrips.filter((t) =>
            t.entry_places.some((ep) => ep.places.country_code === country.code)
          )
        );
        setCities(cityRows);
        setPlace(placeRow);
        setBestTime(((placeRow?.details as { best_time?: string })?.best_time as string) ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [country]);

  const visited = useMemo(() => trips.some((t) => t.status === "done"), [trips]);

  if (!country) {
    return (
      <>
        <Link href="/travel" className="backlink">← Travel</Link>
        <h1>Unknown country</h1>
      </>
    );
  }

  async function addCity(e: React.FormEvent) {
    e.preventDefault();
    const name = newCity.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const countryPlace = place ?? (await ensureCountryPlace(country!.code, country!.name));
      setPlace(countryPlace);
      const city = await createCity(name, countryPlace);
      setCities((prev) => [...prev, city].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCity("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeCity(city: Place) {
    if (!window.confirm(`Remove ${city.name}?`)) return;
    try {
      await deletePlace(city.id);
      setCities((prev) => prev.filter((c) => c.id !== city.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveBestTime(text: string) {
    setBusy(true);
    setError(null);
    try {
      const countryPlace = place ?? (await ensureCountryPlace(country!.code, country!.name));
      const updated = await updatePlaceDetails(countryPlace.id, {
        ...countryPlace.details,
        best_time: text,
      });
      setPlace(updated);
      setBestTime(text);
      setEditingBestTime(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function generateBestTime() {
    setBusy(true);
    setError(null);
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session) throw new Error("Sign in first");
      const res = await fetch("/api/best-time", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ country: country!.name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      await saveBestTime(body.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/travel" className="backlink">← Travel</Link>
      <div className="section-head">
        <h1>{country.name}</h1>
        {visited && <span className="badge">Visited</span>}
      </div>
      <p className="muted">{country.continent}</p>

      <div className="section-head">
        <h2>Trips</h2>
        <Link href={`/travel/trip/new?country=${country.code}`} className="btn secondary">
          Plan a trip
        </Link>
      </div>
      {trips.length === 0 && <p className="muted">No trips here yet.</p>}
      <ul className="itemlist">
        {trips.map((t) => (
          <li key={t.id}>
            <Link href={`/travel/trip/${t.id}`}>
              <strong>{t.title}</strong>
              <span className="muted">
                {t.status === "done" ? "been" : "planned"}
                {t.entry_dates.length > 0 && ` · ${t.entry_dates[0].date}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Cities</h2>
      {cities.length > 0 && (
        <div className="chips">
          {cities.map((c) => (
            <span key={c.id} className="chip">
              {c.name}
              <button type="button" aria-label={`Remove ${c.name}`} onClick={() => removeCity(c)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {isConfigured && (
        <form onSubmit={addCity} className="rowform">
          <input
            type="text"
            className="textfield"
            placeholder="Add a city…"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
          />
          <button type="submit" className="btn secondary" disabled={busy || !newCity.trim()}>
            Add
          </button>
        </form>
      )}

      <h2>Best time to visit</h2>
      {editingBestTime ? (
        <>
          <textarea
            className="textfield"
            rows={5}
            value={bestTime}
            onChange={(e) => setBestTime(e.target.value)}
          />
          <div className="settings-actions">
            <button className="btn" disabled={busy} onClick={() => saveBestTime(bestTime)}>
              Save
            </button>
            <button className="btn secondary" onClick={() => setEditingBestTime(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : bestTime ? (
        <>
          <p>{bestTime}</p>
          <div className="settings-actions">
            <button className="btn secondary" onClick={() => setEditingBestTime(true)}>
              Edit
            </button>
            <button className="btn secondary" disabled={busy} onClick={generateBestTime}>
              Regenerate
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Not generated yet — cached once generated, editable anytime.</p>
          {isConfigured && (
            <button className="btn secondary" disabled={busy} onClick={generateBestTime}>
              {busy ? "Generating…" : "Generate with AI"}
            </button>
          )}
        </>
      )}
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
