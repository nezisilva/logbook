"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEntry,
  deleteEntry,
  isConfigured,
  setEntryDates,
  setEntryPeople,
  setEntryPlaces,
  updateEntry,
} from "@/lib/db";
import {
  artistNames,
  ensureVenuePlace,
  type ConcertArtist,
  type ConcertDetails,
  type ConcertFull,
} from "@/lib/concerts";
import { supabase } from "@/lib/supabase";
import type { Person, Place } from "@/lib/types";
import CityPicker from "./CityPicker";
import PeoplePicker from "./PeoplePicker";
import StatusPicker from "./StatusPicker";
import RatingInput from "./RatingInput";
import NotesField from "./NotesField";
import DateListInput from "./DateListInput";

const STATUS_OPTIONS = [
  { value: "done", label: "Been to" },
  { value: "want", label: "Want to go" },
];

export default function ConcertForm({ concertId }: { concertId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("done");
  const [lineup, setLineup] = useState<ConcertArtist[]>([]);
  const [artistInput, setArtistInput] = useState("");
  const [knownArtists, setKnownArtists] = useState<string[]>([]);
  const [city, setCity] = useState<Place | null>(null);
  const [venue, setVenue] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rating, setRating] = useState(0);
  const [setlistUrl, setSetlistUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(Boolean(concertId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    artistNames().then(setKnownArtists).catch(() => {});
  }, []);

  useEffect(() => {
    if (!concertId || !supabase) return;
    supabase
      .from("entries")
      .select(
        "*, entry_people(person_id, role, people(*)), entry_dates(*), entry_places(place_id, places(*))"
      )
      .eq("id", concertId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setError(error?.message ?? "Not found.");
          setLoading(false);
          return;
        }
        const c = data as unknown as ConcertFull;
        setTitle(c.title);
        setStatus(c.status);
        setRating(c.rating ?? 0);
        setNotes(c.notes ?? "");
        setLineup(c.details.lineup ?? []);
        setVenue(c.details.venue ?? "");
        setSetlistUrl(c.details.setlist_url ?? "");
        setDates(c.entry_dates.map((d) => d.date).sort());
        setPeople(c.entry_people.filter((ep) => ep.role === "with").map((ep) => ep.people));
        setCity(c.entry_places.find((ep) => ep.places.kind === "city")?.places ?? null);
        setLoading(false);
      });
  }, [concertId]);

  const artistSuggestions = artistInput.trim()
    ? knownArtists
        .filter(
          (name) =>
            name.toLowerCase().includes(artistInput.trim().toLowerCase()) &&
            !lineup.some((a) => a.name === name)
        )
        .slice(0, 5)
    : [];

  function addArtist(support: boolean, name = artistInput.trim()) {
    if (!name || lineup.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    setLineup([...lineup, { name, support: support || undefined }]);
    setArtistInput("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (lineup.length === 0 && !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const headline = lineup.filter((a) => !a.support).map((a) => a.name);
      const fallbackTitle =
        headline.join(" + ") || lineup.map((a) => a.name).join(" + ") || "Concert";
      const details: ConcertDetails = {
        lineup,
        venue: venue.trim() || undefined,
        setlist_url: setlistUrl.trim() || undefined,
      };
      const fields = {
        title: title.trim() || fallbackTitle,
        status,
        rating: status === "done" && rating > 0 ? rating : null,
        notes: notes.trim() || null,
        details: details as Record<string, unknown>,
      };
      const entry = concertId
        ? await updateEntry(concertId, fields)
        : await createEntry({ area: "concert", ...fields });

      const placeIds: string[] = [];
      if (city) {
        placeIds.push(city.id);
        if (venue.trim()) placeIds.push((await ensureVenuePlace(venue.trim(), city)).id);
      }
      await setEntryPlaces(entry.id, placeIds);
      await setEntryDates(entry.id, dates.filter(Boolean).map((date) => ({ date })));
      await setEntryPeople(entry.id, "with", people.map((p) => p.id));
      router.push("/concerts");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!concertId || !window.confirm("Delete this concert?")) return;
    setBusy(true);
    try {
      await deleteEntry(concertId);
      router.push("/concerts");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!isConfigured) return <p className="muted">Concerts need Supabase configured.</p>;

  return (
    <form onSubmit={save}>
      <StatusPicker options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <div className="field">
        <label>Lineup — headliners and support acts</label>
        {lineup.length > 0 && (
          <div className="chips">
            {lineup.map((a) => (
              <span key={a.name} className={a.support ? "chip chip-support" : "chip"}>
                {a.name}
                {a.support && <span className="muted"> (support)</span>}
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setLineup(lineup.filter((x) => x.name !== a.name))}
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
          placeholder="Artist name…"
          value={artistInput}
          onChange={(e) => setArtistInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addArtist(false);
            }
          }}
        />
        {artistSuggestions.length > 0 && (
          <ul className="suggestions">
            {artistSuggestions.map((name) => (
              <li key={name}>
                <button type="button" onClick={() => addArtist(false, name)}>
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {artistInput.trim() && (
          <div className="settings-actions">
            <button type="button" className="btn secondary" onClick={() => addArtist(false)}>
              Add headliner
            </button>
            <button type="button" className="btn secondary" onClick={() => addArtist(true)}>
              Add support act
            </button>
          </div>
        )}
      </div>

      <div className="field">
        <label>Title (optional — defaults to the headliners)</label>
        <input
          type="text"
          className="textfield"
          placeholder="e.g. Primavera Sound 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <CityPicker value={city} onChange={setCity} />
      <div className="field">
        <label>Venue</label>
        <input
          type="text"
          className="textfield"
          placeholder="e.g. Coliseu dos Recreios"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </div>

      <DateListInput
        dates={dates}
        onChange={setDates}
        label={status === "want" ? "Dates I'm tracking" : "Dates"}
      />
      <PeoplePicker
        selected={people}
        onChange={setPeople}
        label={status === "want" ? "Who to go with" : "Who I went with"}
      />
      {status === "done" && <RatingInput value={rating} onChange={setRating} />}

      <div className="field">
        <label>Setlist link</label>
        <input
          type="url"
          className="textfield"
          placeholder="https://www.setlist.fm/…"
          value={setlistUrl}
          onChange={(e) => setSetlistUrl(e.target.value)}
        />
      </div>

      <NotesField value={notes} onChange={setNotes} />
      {error && <p className="error-text">{error}</p>}
      <div className="settings-actions">
        <button
          type="submit"
          className="btn"
          disabled={busy || (lineup.length === 0 && !title.trim())}
        >
          {busy ? "Saving…" : "Save concert"}
        </button>
        {concertId && (
          <button type="button" className="btn secondary" disabled={busy} onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
