"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEntry,
  deleteEntry,
  ensureCountryPlace,
  getTrip,
  isConfigured,
  setEntryDates,
  setEntryPeople,
  setEntryPlaces,
  updateEntry,
} from "@/lib/db";
import { COUNTRY_BY_CODE } from "@/lib/countries";
import type { Person } from "@/lib/types";
import CountryPicker from "./CountryPicker";
import PeoplePicker from "./PeoplePicker";
import DateListInput from "./DateListInput";
import StatusPicker from "./StatusPicker";
import RatingInput from "./RatingInput";
import NotesField from "./NotesField";

const STATUS_OPTIONS = [
  { value: "done", label: "Been" },
  { value: "wishlist", label: "Planned" },
];

export default function TripForm({
  tripId,
  initialCountry,
}: {
  tripId?: string;
  initialCountry?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("done");
  const [countries, setCountries] = useState<string[]>(
    initialCountry && COUNTRY_BY_CODE[initialCountry] ? [initialCountry] : []
  );
  const [dates, setDates] = useState<string[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  // city links are managed on the country page; preserve them when editing
  const [cityPlaceIds, setCityPlaceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    getTrip(tripId)
      .then((trip) => {
        if (!trip) {
          setError("Trip not found.");
          return;
        }
        setTitle(trip.title);
        setStatus(trip.status);
        setRating(trip.rating ?? 0);
        setNotes(trip.notes ?? "");
        setCountries(
          trip.entry_places
            .filter((ep) => ep.places.kind === "country" && ep.places.country_code)
            .map((ep) => ep.places.country_code as string)
        );
        setCityPlaceIds(
          trip.entry_places.filter((ep) => ep.places.kind === "city").map((ep) => ep.place_id)
        );
        setDates(trip.entry_dates.map((d) => d.date).sort());
        setPeople(trip.entry_people.filter((ep) => ep.role === "with").map((ep) => ep.people));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [tripId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fallbackTitle =
        countries.map((c) => COUNTRY_BY_CODE[c]?.name ?? c).join(", ") || "Trip";
      const fields = {
        title: title.trim() || fallbackTitle,
        status,
        rating: status === "done" && rating > 0 ? rating : null,
        notes: notes.trim() || null,
      };
      const entry = tripId
        ? await updateEntry(tripId, fields)
        : await createEntry({ area: "trip", ...fields });

      const countryPlaces = await Promise.all(
        countries.map((code) => ensureCountryPlace(code, COUNTRY_BY_CODE[code]?.name ?? code))
      );
      await setEntryPlaces(entry.id, [...countryPlaces.map((p) => p.id), ...cityPlaceIds]);
      await setEntryDates(entry.id, dates.filter(Boolean).map((date) => ({ date })));
      await setEntryPeople(entry.id, "with", people.map((p) => p.id));
      router.push("/travel");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!tripId || !window.confirm("Delete this trip?")) return;
    setBusy(true);
    try {
      await deleteEntry(tripId);
      router.push("/travel");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!isConfigured) return <p className="muted">Trips need Supabase configured.</p>;

  return (
    <form onSubmit={save}>
      <div className="field">
        <label>Title</label>
        <input
          type="text"
          className="textfield"
          placeholder="e.g. Summer in Portugal (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <StatusPicker options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      <CountryPicker selected={countries} onChange={setCountries} />
      <DateListInput
        dates={dates}
        onChange={setDates}
        label={status === "wishlist" ? "Possible dates" : "Dates"}
      />
      <PeoplePicker
        selected={people}
        onChange={setPeople}
        label={status === "wishlist" ? "Who to go with" : "Who I went with"}
      />
      {status === "done" && <RatingInput value={rating} onChange={setRating} />}
      <NotesField value={notes} onChange={setNotes} />
      {error && <p className="error-text">{error}</p>}
      <div className="settings-actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save trip"}
        </button>
        {tripId && (
          <button type="button" className="btn secondary" disabled={busy} onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
