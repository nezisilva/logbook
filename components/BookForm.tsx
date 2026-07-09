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
import { isbnLookup, type BookDetails, type BookFull } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/lib/types";
import PeoplePicker from "./PeoplePicker";
import StatusPicker from "./StatusPicker";
import RatingInput from "./RatingInput";
import NotesField from "./NotesField";

const STATUS_OPTIONS = [
  { value: "want", label: "Want" },
  { value: "reading", label: "Reading" },
  { value: "done", label: "Read" },
  { value: "dnf", label: "DNF" },
];

const TYPE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audio" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "—" },
  { value: "bought", label: "Bought" },
  { value: "online", label: "Read online" },
  { value: "borrowed", label: "Borrowed" },
  { value: "gift", label: "Gift" },
];

const WANT_SOURCE_OPTIONS = [
  { value: "", label: "—" },
  { value: "owned", label: "Already own" },
  { value: "friend", label: "Friend owns" },
  { value: "buy", label: "Buy" },
  { value: "library", label: "Library" },
];

export default function BookForm({ bookId }: { bookId?: string }) {
  const router = useRouter();
  const [isbn, setIsbn] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [pages, setPages] = useState("");
  const [series, setSeries] = useState("");
  const [seriesOrder, setSeriesOrder] = useState("");
  const [bookType, setBookType] = useState("physical");
  const [narrator, setNarrator] = useState("");
  const [length, setLength] = useState("");
  const [status, setStatus] = useState("done");
  const [progress, setProgress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState(0);
  const [owned, setOwned] = useState(false);
  const [location, setLocation] = useState("");
  const [lentTo, setLentTo] = useState<Person[]>([]);
  const [sourceKind, setSourceKind] = useState("");
  const [borrowedFrom, setBorrowedFrom] = useState<Person[]>([]);
  const [sourceHouse, setSourceHouse] = useState("");
  const [wantSource, setWantSource] = useState("");
  const [friendOwns, setFriendOwns] = useState<Person[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(Boolean(bookId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId || !supabase) return;
    supabase
      .from("entries")
      .select("*, entry_people(person_id, role, people(*)), entry_dates(*)")
      .eq("id", bookId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setError(error?.message ?? "Book not found.");
          setLoading(false);
          return;
        }
        const book = data as unknown as BookFull;
        const d = book.details;
        setTitle(book.title);
        setStatus(book.status);
        setRating(book.rating ?? 0);
        setNotes(book.notes ?? "");
        setIsbn(d.isbn ?? "");
        setAuthor(d.author ?? "");
        setCoverUrl(d.cover_url ?? "");
        setPages(d.pages ? String(d.pages) : "");
        setSeries(d.series ?? "");
        setSeriesOrder(d.series_order ? String(d.series_order) : "");
        setBookType(d.book_type ?? "physical");
        setNarrator(d.narrator ?? "");
        setLength(d.length ?? "");
        setProgress(d.progress ?? "");
        setOwned(Boolean(d.owned));
        setLocation(d.location ?? "");
        setSourceKind(d.source_kind ?? "");
        setSourceHouse(d.source_house ?? "");
        setWantSource(d.want_source ?? "");
        setStartDate(book.entry_dates.find((x) => x.kind === "start")?.date ?? "");
        setFinishDate(book.entry_dates.find((x) => x.kind === "finish")?.date ?? "");
        const byRole = (role: string) =>
          book.entry_people.filter((ep) => ep.role === role).map((ep) => ep.people);
        setLentTo(byRole("has_my_copy"));
        setBorrowedFrom(byRole("lent_by"));
        setFriendOwns(byRole("friend_owns"));
        setLoading(false);
      });
  }, [bookId]);

  async function lookup() {
    setLookingUp(true);
    setLookupNote(null);
    const result = await isbnLookup(isbn);
    setLookingUp(false);
    if (!result) {
      setLookupNote("No match found for that ISBN.");
      return;
    }
    if (result.title) setTitle(result.title);
    if (result.author) setAuthor(result.author);
    if (result.pages) setPages(String(result.pages));
    if (result.cover_url) setCoverUrl(result.cover_url);
    setLookupNote("Filled from ISBN.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const details: BookDetails = {
        author: author.trim() || undefined,
        isbn: isbn.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        pages: pages ? Number(pages) : undefined,
        series: series.trim() || undefined,
        series_order: seriesOrder ? Number(seriesOrder) : undefined,
        book_type: bookType as BookDetails["book_type"],
        narrator: bookType === "audiobook" ? narrator.trim() || undefined : undefined,
        length: bookType === "audiobook" ? length.trim() || undefined : undefined,
        progress: status === "reading" ? progress.trim() || undefined : undefined,
        owned: owned || undefined,
        location: owned ? location.trim() || undefined : undefined,
        source_kind: sourceKind || undefined,
        source_house: sourceHouse.trim() || undefined,
        want_source: status === "want" ? wantSource || undefined : undefined,
      };
      const fields = {
        title: title.trim(),
        status,
        rating: (status === "done" || status === "dnf") && rating > 0 ? rating : null,
        notes: notes.trim() || null,
        details: details as Record<string, unknown>,
      };
      const entry = bookId
        ? await updateEntry(bookId, fields)
        : await createEntry({ area: "book", ...fields });

      const dates: { date: string; kind: string }[] = [];
      if (startDate) dates.push({ date: startDate, kind: "start" });
      if (finishDate) dates.push({ date: finishDate, kind: "finish" });
      await setEntryDates(entry.id, dates);
      await setEntryPeople(entry.id, "has_my_copy", lentTo.map((p) => p.id));
      await setEntryPeople(entry.id, "lent_by", borrowedFrom.map((p) => p.id));
      await setEntryPeople(entry.id, "friend_owns", friendOwns.map((p) => p.id));
      router.push("/books");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!bookId || !window.confirm("Delete this book?")) return;
    setBusy(true);
    try {
      await deleteEntry(bookId);
      router.push("/books");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!isConfigured) return <p className="muted">Books need Supabase configured.</p>;

  return (
    <form onSubmit={save}>
      <div className="field">
        <label>ISBN — autofills title, author, cover, pages</label>
        <div className="rowform">
          <input
            type="text"
            className="textfield"
            inputMode="numeric"
            placeholder="e.g. 9780261102217"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <button
            type="button"
            className="btn secondary"
            disabled={lookingUp || !isbn.trim()}
            onClick={lookup}
          >
            {lookingUp ? "…" : "Look up"}
          </button>
        </div>
        {lookupNote && <span className="muted">{lookupNote}</span>}
      </div>

      {coverUrl && (
        // external cover URL by design (keep storage light); next/image needs a domain allowlist
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="Cover" className="book-cover-preview" loading="lazy" />
      )}

      <div className="field">
        <label>Title *</label>
        <input
          type="text"
          className="textfield"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Author</label>
        <input
          type="text"
          className="textfield"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>

      <StatusPicker options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      <StatusPicker options={TYPE_OPTIONS} value={bookType} onChange={setBookType} label="Type" />

      {bookType === "audiobook" && (
        <div className="fieldrow">
          <div className="field">
            <label>Narrator</label>
            <input
              type="text"
              className="textfield"
              value={narrator}
              onChange={(e) => setNarrator(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Length</label>
            <input
              type="text"
              className="textfield"
              placeholder="11h 32m"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>
        </div>
      )}

      {status === "reading" && (
        <div className="field">
          <label>Progress</label>
          <input
            type="text"
            className="textfield"
            placeholder="p. 214 or 62%"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
          />
        </div>
      )}

      {status !== "want" && (
        <div className="fieldrow">
          <div className="field">
            <label>Started</label>
            <input
              type="date"
              className="textfield"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Finished</label>
            <input
              type="date"
              className="textfield"
              value={finishDate}
              onChange={(e) => setFinishDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {(status === "done" || status === "dnf") && (
        <RatingInput value={rating} onChange={setRating} />
      )}

      <div className="fieldrow">
        <div className="field">
          <label>Series</label>
          <input
            type="text"
            className="textfield"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
          />
        </div>
        <div className="field">
          <label>#</label>
          <input
            type="number"
            className="textfield"
            min="1"
            value={seriesOrder}
            onChange={(e) => setSeriesOrder(e.target.value)}
          />
        </div>
      </div>

      {status === "want" ? (
        <>
          <StatusPicker
            options={WANT_SOURCE_OPTIONS}
            value={wantSource}
            onChange={setWantSource}
            label="Where I can get it"
          />
          {wantSource === "friend" && (
            <PeoplePicker selected={friendOwns} onChange={setFriendOwns} label="Which friend" />
          )}
        </>
      ) : (
        <>
          <StatusPicker
            options={SOURCE_OPTIONS}
            value={sourceKind}
            onChange={setSourceKind}
            label="Source"
          />
          {sourceKind === "borrowed" && (
            <>
              <PeoplePicker
                selected={borrowedFrom}
                onChange={setBorrowedFrom}
                label="Borrowed from"
              />
              <div className="field">
                <label>…or which house</label>
                <input
                  type="text"
                  className="textfield"
                  placeholder="e.g. parents' house"
                  value={sourceHouse}
                  onChange={(e) => setSourceHouse(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="field">
        <label className="checkline">
          <input type="checkbox" checked={owned} onChange={(e) => setOwned(e.target.checked)} />
          I own a copy
        </label>
      </div>
      {owned && (
        <>
          <div className="field">
            <label>Where it lives (shelf / house)</label>
            <input
              type="text"
              className="textfield"
              placeholder="e.g. bedroom shelf, grandparents' house"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <PeoplePicker selected={lentTo} onChange={setLentTo} label="Currently lent to" />
        </>
      )}

      <div className="field">
        <label>Pages</label>
        <input
          type="number"
          className="textfield"
          min="1"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
        />
      </div>

      <NotesField value={notes} onChange={setNotes} />
      {error && <p className="error-text">{error}</p>}
      <div className="settings-actions">
        <button type="submit" className="btn" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : "Save book"}
        </button>
        {bookId && (
          <button type="button" className="btn secondary" disabled={busy} onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
