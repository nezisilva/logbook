import { supabase } from "./supabase";
import type { Entry, EntryDate, Person } from "./types";

// Movie/series-specific fields live in entries.details.
// area = "movie": status want | done. Multiple dates (kind "on") = rewatches.
// area = "series": status want | watching | done, plus episode progress.
export interface WatchDetails {
  tmdb_id?: number;
  poster_url?: string;
  year?: string;
  progress_season?: number; // series only
  progress_episode?: number; // series only
  show_status?: "ongoing" | "ended"; // series only
}

// People roles: "with" (watched with), "suggested_by" (recommender leaderboard).

export interface WatchFull extends Omit<Entry, "details"> {
  details: WatchDetails;
  entry_people: { person_id: string; role: string; people: Person }[];
  entry_dates: EntryDate[];
}

export const WATCH_PAGE_SIZE = 30;

export interface WatchFilters {
  kind: "movie" | "series";
  status?: string;
  search?: string;
  offset?: number;
}

export async function listWatch(filters: WatchFilters): Promise<WatchFull[]> {
  if (!supabase) return [];
  const offset = filters.offset ?? 0;
  let q = supabase
    .from("entries")
    .select("*, entry_people(person_id, role, people(*)), entry_dates(*)")
    .eq("area", filters.kind)
    .order("updated_at", { ascending: false })
    .range(offset, offset + WATCH_PAGE_SIZE - 1);
  if (filters.status) q = q.eq("status", filters.status);
  const s = filters.search?.trim().replace(/[,%]/g, "");
  if (s) q = q.ilike("title", `%${s}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as WatchFull[];
}

export interface RecommenderRow {
  name: string;
  count: number;
  avg: number; // half-stars
}

/** Whose suggestions I end up rating highest (movies + series with a rating). */
export async function recommenderLeaderboard(): Promise<RecommenderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("entry_people")
    .select("people(name), entries!inner(rating, area)")
    .eq("role", "suggested_by")
    .in("entries.area", ["movie", "series"])
    .not("entries.rating", "is", null);
  if (error) throw error;
  const byName = new Map<string, { sum: number; count: number }>();
  for (const row of data as unknown as {
    people: { name: string };
    entries: { rating: number };
  }[]) {
    const cur = byName.get(row.people.name) ?? { sum: 0, count: 0 };
    cur.sum += row.entries.rating;
    cur.count += 1;
    byName.set(row.people.name, cur);
  }
  return [...byName.entries()]
    .map(([name, { sum, count }]) => ({ name, count, avg: sum / count }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 10);
}

// ---------- TMDB autofill (via our auth-gated proxy) ----------

export interface TmdbResult {
  tmdb_id: number;
  title: string;
  year?: string;
  poster_url?: string;
}

export async function tmdbSearch(query: string, kind: "movie" | "series"): Promise<TmdbResult[]> {
  if (!supabase) return [];
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Sign in first");
  const res = await fetch(
    `/api/tmdb?query=${encodeURIComponent(query)}&kind=${kind}`,
    { headers: { authorization: `Bearer ${session.access_token}` } }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Search failed (${res.status})`);
  return body.results;
}
