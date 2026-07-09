"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEntry,
  deleteEntry,
  isConfigured,
  setEntryDates,
  setEntryPeople,
  updateEntry,
} from "@/lib/db";
import { tmdbSearch, type TmdbResult, type WatchDetails, type WatchFull } from "@/lib/tv";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/lib/types";
import PeoplePicker from "./PeoplePicker";
import StatusPicker from "./StatusPicker";
import RatingInput from "./RatingInput";
import NotesField from "./NotesField";
import DateListInput from "./DateListInput";

const KIND_OPTIONS = [
  { value: "movie", label: "Movie" },
  { value: "series", label: "Series" },
];

const MOVIE_STATUS = [
  { value: "want", label: "Want to watch" },
  { value: "done", label: "Watched" },
];

const SERIES_STATUS = [
  { value: "want", label: "Want" },
  { value: "watching", label: "Watching" },
  { value: "done", label: "Watched" },
];

const WHERE_PRESETS = ["Home", "Cinema", "Netflix", "HBO Max", "Disney+", "Prime Video"];

export default function WatchForm({
  watchId,
  initialKind = "movie",
}: {
  watchId?: string;
  initialKind?: "movie" | "series";
}) {
  const router = useRouter();
  const [kind, setKind] = useState<string>(initialKind);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [tmdbId, setTmdbId] = useState<number | undefined>();
  const [suggestions, setSuggestions] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("done");
  const [rating, setRating] = useState(0);
  const [where, setWhere] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [watchedWith, setWatchedWith] = useState<Person[]>([]);
  const [suggestedBy, setSuggestedBy] = useState<Person[]>([]);
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [showStatus, setShowStatus] = useState("ongoing");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(Boolean(watchId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!watchId || !supabase) return;
    supabase
      .from("entries")
      .select("*, entry_people(person_id, role, people(*)), entry_dates(*)")
      .eq("id", watchId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setError(error?.message ?? "Not found.");
          setLoading(false);
          return;
        }
        const item = data as unknown as WatchFull;
        const d = item.details;
        setKind(item.area);
        setTitle(item.title);
        setStatus(item.status);
        setRating(item.rating ?? 0);
        setWhere(item.source ?? "");
        setNotes(item.notes ?? "");
        setYear(d.year ?? "");
        setPosterUrl(d.poster_url ?? "");
        setTmdbId(d.tmdb_id);
        setSeason(d.progress_season ? String(d.progress_season) : "");
        setEpisode(d.progress_episode ? String(d.progress_episode) : "");
        setShowStatus(d.show_status ?? "ongoing");
        setDates(item.entry_dates.map((x) => x.date).sort());
        const byRole = (role: string) =>
          item.entry_people.filter((ep) => ep.role === role).map((ep) => ep.people);
        setWatchedWith(byRole("with"));
        setSuggestedBy(byRole("suggested_by"));
        setLoading(false);
      });
  }, [watchId]);

  async function search() {
    if (!title.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setSuggestions(await tmdbSearch(title.trim(), kind as "movie" | "series"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  function pick(r: TmdbResult) {
    setTitle(r.title);
    setYear(r.year ?? "");
    setPosterUrl(r.poster_url ?? "");
    setTmdbId(r.tmdb_id);
    setSuggestions([]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const isSeries = kind === "series";
      const details: WatchDetails = {
        tmdb_id: tmdbId,
        poster_url: posterUrl.trim() || undefined,
        year: year.trim() || undefined,
        progress_season: isSeries && season ? Number(season) : undefined,
        progress_episode: isSeries && episode ? Number(episode) : undefined,
        show_status: isSeries ? (showStatus as WatchDetails["show_status"]) : undefined,
      };
      const fields = {
        title: title.trim(),
        status,
        rating: status !== "want" && rating > 0 ? rating : null,
        source: where.trim() || null,
        notes: notes.trim() || null,
        details: details as Record<string, unknown>,
      };
      const entry = watchId
        ? await updateEntry(watchId, fields)
        : await createEntry({ area: kind as "movie" | "series", ...fields });
      await setEntryDates(entry.id, dates.filter(Boolean).map((date) => ({ date })));
      await setEntryPeople(entry.id, "with", watchedWith.map((p) => p.id));
      await setEntryPeople(entry.id, "suggested_by", suggestedBy.map((p) => p.id));
      router.push("/tv");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!watchId || !window.confirm("Delete this entry?")) return;
    setBusy(true);
    try {
      await deleteEntry(watchId);
      router.push("/tv");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!isConfigured) return <p className="muted">TV & Movies needs Supabase configured.</p>;

  const isSeries = kind === "series";

  return (
    <form onSubmit={save}>
      {!watchId && <StatusPicker options={KIND_OPTIONS} value={kind} onChange={setKind} label="" />}

      <div className="field">
        <label>Title * — search fills poster and year</label>
        <div className="rowform">
          <input
            type="text"
            className="textfield"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            required
          />
          <button
            type="button"
            className="btn secondary"
            disabled={searching || !title.trim()}
            onClick={search}
          >
            {searching ? "…" : "Search"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((r) => (
              <li key={r.tmdb_id}>
                <button type="button" onClick={() => pick(r)}>
                  {r.title}
                  {r.year && <span className="muted"> ({r.year})</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="Poster" className="book-cover-preview" loading="lazy" />
      )}

      <StatusPicker
        options={isSeries ? SERIES_STATUS : MOVIE_STATUS}
        value={status}
        onChange={setStatus}
      />

      {isSeries && status !== "want" && (
        <>
          <div className="fieldrow">
            <div className="field">
              <label>Season</label>
              <input
                type="number"
                className="textfield"
                min="1"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Episode</label>
              <input
                type="number"
                className="textfield"
                min="1"
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
              />
            </div>
          </div>
          <StatusPicker
            options={[
              { value: "ongoing", label: "Ongoing" },
              { value: "ended", label: "Ended" },
            ]}
            value={showStatus}
            onChange={setShowStatus}
            label="Show status"
          />
        </>
      )}

      {status !== "want" && (
        <>
          <RatingInput value={rating} onChange={setRating} />
          <div className="field">
            <label>Where</label>
            <div className="chips">
              {WHERE_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={where === w ? "chip chip-on" : "chip"}
                  onClick={() => setWhere(where === w ? "" : w)}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="textfield"
              placeholder="…or type a place / service"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
            />
          </div>
          <DateListInput
            dates={dates}
            onChange={setDates}
            label={kind === "movie" ? "Watch dates (add more for rewatches)" : "Dates"}
          />
          <PeoplePicker selected={watchedWith} onChange={setWatchedWith} label="Watched with" />
        </>
      )}

      <PeoplePicker selected={suggestedBy} onChange={setSuggestedBy} label="Who suggested it" />
      <NotesField value={notes} onChange={setNotes} />
      {error && <p className="error-text">{error}</p>}
      <div className="settings-actions">
        <button type="submit" className="btn" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : "Save"}
        </button>
        {watchId && (
          <button type="button" className="btn secondary" disabled={busy} onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
