"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusPicker from "@/components/StatusPicker";
import { isConfigured } from "@/lib/db";
import {
  BOOK_PAGE_SIZE,
  booksFinishedThisYear,
  listBooks,
  type BookFull,
} from "@/lib/books";

const VIEWS = [
  { value: "reading", label: "Reading" },
  { value: "done", label: "Read" },
  { value: "want", label: "Want" },
  { value: "owned", label: "Owned" },
  { value: "dnf", label: "DNF" },
];

const TYPES = [
  { value: "", label: "All" },
  { value: "physical", label: "Physical" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audio" },
];

const GOAL_KEY = "logbook-reading-goal";

function BookRow({ book }: { book: BookFull }) {
  const d = book.details;
  const lentTo = book.entry_people.filter((ep) => ep.role === "has_my_copy");
  return (
    <li>
      <Link href={`/books/${book.id}`} className="bookrow">
        {d.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.cover_url} alt="" loading="lazy" className="book-cover" />
        ) : (
          <span className="book-cover placeholder" aria-hidden="true">
            📖
          </span>
        )}
        <span className="bookrow-main">
          <strong>{book.title}</strong>
          <span className="muted">
            {d.author}
            {d.series && ` · ${d.series}${d.series_order ? ` #${d.series_order}` : ""}`}
          </span>
          <span className="muted">
            {book.rating ? "★".repeat(Math.round(book.rating / 2)) + " · " : ""}
            {d.book_type === "audiobook" && "🎧 "}
            {book.status === "reading" && d.progress ? `at ${d.progress}` : ""}
            {lentTo.length > 0 && `lent to ${lentTo.map((p) => p.people.name).join(", ")}`}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function Books() {
  const [view, setView] = useState("reading");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // applied search
  const [books, setBooks] = useState<BookFull[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [yearCount, setYearCount] = useState<number | null>(null);
  const [goal, setGoal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const filters = useCallback(
    (offset: number) => ({
      status: view === "owned" ? undefined : view,
      owned: view === "owned" || undefined,
      type: type || undefined,
      search: query || undefined,
      offset,
    }),
    [view, type, query]
  );

  useEffect(() => {
    setLoaded(false);
    listBooks(filters(0))
      .then((rows) => {
        setBooks(rows);
        setHasMore(rows.length === BOOK_PAGE_SIZE);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }, [filters]);

  useEffect(() => {
    booksFinishedThisYear().then(setYearCount).catch(() => {});
    setGoal(Number(localStorage.getItem(GOAL_KEY)) || 0);
  }, []);

  async function loadMore() {
    const rows = await listBooks(filters(books.length));
    setBooks((prev) => [...prev, ...rows]);
    setHasMore(rows.length === BOOK_PAGE_SIZE);
  }

  function updateGoal() {
    const value = window.prompt("Reading goal for this year (0 to clear):", String(goal || 12));
    if (value === null) return;
    const n = Math.max(0, Number(value) || 0);
    setGoal(n);
    localStorage.setItem(GOAL_KEY, String(n));
  }

  return (
    <>
      <div className="section-head">
        <h1>Books</h1>
        <span className="settings-actions">
          <Link href="/books/import" className="btn secondary">
            Import
          </Link>
          <Link href="/books/new" className="btn">
            Add book
          </Link>
        </span>
      </div>

      {yearCount !== null && (
        <button type="button" className="goal" onClick={updateGoal}>
          <strong>{yearCount}</strong> read this year
          {goal > 0 && (
            <>
              {" "}
              · goal {goal}
              <span className="goal-track">
                <span
                  className="goal-fill"
                  style={{ width: `${Math.min(100, (yearCount / goal) * 100)}%` }}
                />
              </span>
            </>
          )}
        </button>
      )}

      <StatusPicker label="" options={VIEWS} value={view} onChange={setView} />
      <div className="rowform">
        <input
          type="search"
          className="textfield"
          placeholder="Search title or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
        />
        <button type="button" className="btn secondary" onClick={() => setQuery(search)}>
          Search
        </button>
      </div>
      <StatusPicker label="" options={TYPES} value={type} onChange={setType} />

      {error && <p className="error-text">{error}</p>}
      {!isConfigured && <p className="muted">Books need Supabase configured.</p>}
      {isConfigured && loaded && books.length === 0 && (
        <p className="muted">Nothing here yet.</p>
      )}
      <ul className="itemlist">
        {books.map((b) => (
          <BookRow key={b.id} book={b} />
        ))}
      </ul>
      {hasMore && (
        <button type="button" className="btn secondary loadmore" onClick={loadMore}>
          Load more
        </button>
      )}
    </>
  );
}
