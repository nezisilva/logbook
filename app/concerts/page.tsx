"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusPicker from "@/components/StatusPicker";
import { isConfigured } from "@/lib/db";
import {
  CONCERT_PAGE_SIZE,
  headliners,
  listConcerts,
  type ConcertFull,
} from "@/lib/concerts";

const VIEWS = [
  { value: "done", label: "Been to" },
  { value: "want", label: "Want to go" },
];

function ConcertRow({ concert }: { concert: ConcertFull }) {
  const cityName = concert.entry_places.find((ep) => ep.places.kind === "city")?.places.name;
  const supports = (concert.details.lineup ?? []).filter((a) => a.support);
  const withPeople = concert.entry_people.filter((ep) => ep.role === "with");
  return (
    <li>
      <Link href={`/concerts/${concert.id}`}>
        <strong>{concert.title || headliners(concert)}</strong>
        <span className="muted">
          {[
            concert.entry_dates[0]?.date,
            [concert.details.venue, cityName].filter(Boolean).join(", "),
            concert.rating ? "★".repeat(Math.round(concert.rating / 2)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {supports.length > 0 && (
          <span className="muted">support: {supports.map((a) => a.name).join(", ")}</span>
        )}
        {withPeople.length > 0 && (
          <span className="muted">with {withPeople.map((p) => p.people.name).join(", ")}</span>
        )}
      </Link>
    </li>
  );
}

export default function Concerts() {
  const [view, setView] = useState("done");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ConcertFull[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useCallback(
    (offset: number) => ({ status: view, search: query || undefined, offset }),
    [view, query]
  );

  useEffect(() => {
    setLoaded(false);
    listConcerts(filters(0))
      .then((rows) => {
        setItems(rows);
        setHasMore(rows.length === CONCERT_PAGE_SIZE);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }, [filters]);

  async function loadMore() {
    const rows = await listConcerts(filters(items.length));
    setItems((prev) => [...prev, ...rows]);
    setHasMore(rows.length === CONCERT_PAGE_SIZE);
  }

  return (
    <>
      <div className="section-head">
        <h1>Concerts</h1>
        <Link href="/concerts/new" className="btn">
          Add concert
        </Link>
      </div>

      <StatusPicker label="" options={VIEWS} value={view} onChange={setView} />
      <div className="rowform">
        <input
          type="search"
          className="textfield"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
        />
        <button type="button" className="btn secondary" onClick={() => setQuery(search)}>
          Search
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!isConfigured && <p className="muted">Concerts need Supabase configured.</p>}
      {isConfigured && loaded && items.length === 0 && (
        <p className="muted">
          {view === "done" ? "No concerts logged yet." : "No tours you're tracking yet."}
        </p>
      )}
      <ul className="itemlist">
        {items.map((c) => (
          <ConcertRow key={c.id} concert={c} />
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
