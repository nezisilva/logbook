"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusPicker from "@/components/StatusPicker";
import { isConfigured } from "@/lib/db";
import {
  listWatch,
  recommenderLeaderboard,
  WATCH_PAGE_SIZE,
  type RecommenderRow,
  type WatchFull,
} from "@/lib/tv";

const KINDS = [
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
];

const MOVIE_VIEWS = [
  { value: "done", label: "Watched" },
  { value: "want", label: "Want to watch" },
];

const SERIES_VIEWS = [
  { value: "watching", label: "Watching" },
  { value: "done", label: "Watched" },
  { value: "want", label: "Want" },
];

function WatchRow({ item }: { item: WatchFull }) {
  const d = item.details;
  const withPeople = item.entry_people.filter((ep) => ep.role === "with");
  return (
    <li>
      <Link href={`/tv/${item.id}`} className="bookrow">
        {d.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.poster_url} alt="" loading="lazy" className="book-cover" />
        ) : (
          <span className="book-cover placeholder" aria-hidden="true">
            {item.area === "series" ? "📺" : "🎬"}
          </span>
        )}
        <span className="bookrow-main">
          <strong>
            {item.title}
            {d.year && <span className="muted"> ({d.year})</span>}
          </strong>
          <span className="muted">
            {item.rating ? "★".repeat(Math.round(item.rating / 2)) + " " : ""}
            {item.area === "series" && item.status === "watching" && d.progress_season
              ? `S${d.progress_season}E${d.progress_episode ?? "?"} · `
              : ""}
            {item.area === "series" && d.show_status ? `${d.show_status} · ` : ""}
            {item.source ?? ""}
          </span>
          {withPeople.length > 0 && (
            <span className="muted">with {withPeople.map((p) => p.people.name).join(", ")}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function TvAndMovies() {
  const [kind, setKind] = useState("movie");
  const [view, setView] = useState("done");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<WatchFull[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [leaders, setLeaders] = useState<RecommenderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const filters = useCallback(
    (offset: number) => ({
      kind: kind as "movie" | "series",
      status: view,
      search: query || undefined,
      offset,
    }),
    [kind, view, query]
  );

  useEffect(() => {
    // keep view valid when switching kind
    if (kind === "movie" && view === "watching") setView("done");
  }, [kind, view]);

  useEffect(() => {
    setLoaded(false);
    listWatch(filters(0))
      .then((rows) => {
        setItems(rows);
        setHasMore(rows.length === WATCH_PAGE_SIZE);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }, [filters]);

  useEffect(() => {
    recommenderLeaderboard().then(setLeaders).catch(() => {});
  }, []);

  async function loadMore() {
    const rows = await listWatch(filters(items.length));
    setItems((prev) => [...prev, ...rows]);
    setHasMore(rows.length === WATCH_PAGE_SIZE);
  }

  return (
    <>
      <div className="section-head">
        <h1>TV &amp; Movies</h1>
        <Link href={`/tv/new?kind=${kind}`} className="btn">
          Add
        </Link>
      </div>

      <StatusPicker label="" options={KINDS} value={kind} onChange={setKind} />
      <StatusPicker
        label=""
        options={kind === "movie" ? MOVIE_VIEWS : SERIES_VIEWS}
        value={view}
        onChange={setView}
      />
      <div className="rowform">
        <input
          type="search"
          className="textfield"
          placeholder="Search titles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
        />
        <button type="button" className="btn secondary" onClick={() => setQuery(search)}>
          Search
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!isConfigured && <p className="muted">TV &amp; Movies needs Supabase configured.</p>}
      {isConfigured && loaded && items.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul className="itemlist">
        {items.map((item) => (
          <WatchRow key={item.id} item={item} />
        ))}
      </ul>
      {hasMore && (
        <button type="button" className="btn secondary loadmore" onClick={loadMore}>
          Load more
        </button>
      )}

      {leaders.length > 0 && (
        <>
          <h2>Recommender leaderboard</h2>
          <ol className="leaderboard">
            {leaders.map((l) => (
              <li key={l.name}>
                <span>{l.name}</span>
                <span className="muted">
                  {(l.avg / 2).toFixed(1)}★ over {l.count} pick{l.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="muted attribution">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </>
  );
}
