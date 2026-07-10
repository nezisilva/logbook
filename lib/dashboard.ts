import { supabase } from "./supabase";
import type { Area, Entry } from "./types";

export interface RecentItem {
  id: string;
  area: Area;
  title: string;
  status: string;
  updated_at: string;
}

export async function recentActivity(limit = 12): Promise<RecentItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("entries")
    .select("id, area, title, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as RecentItem[];
}

export interface YearInReview {
  year: number;
  countries: number;
  books: number;
  movies: number;
  concerts: number;
}

/** Counts for the current year across all areas, from dated done-entries. */
export async function yearInReview(): Promise<YearInReview> {
  const year = new Date().getFullYear();
  if (!supabase) return { year, countries: 0, books: 0, movies: 0, concerts: 0 };

  // one query: all this-year dates on done entries, with area + linked places
  const { data, error } = await supabase
    .from("entry_dates")
    .select("date, kind, entries!inner(id, area, status, entry_places(places(kind, country_code)))")
    .gte("date", `${year}-01-01`)
    .eq("entries.status", "done");
  if (error) throw error;

  const countries = new Set<string>();
  const books = new Set<string>();
  const movies = new Set<string>();
  const concerts = new Set<string>();
  type Row = {
    kind: string;
    entries: {
      id: string;
      area: Area;
      entry_places: { places: { kind: string; country_code: string | null } }[];
    };
  };
  for (const row of data as unknown as Row[]) {
    const e = row.entries;
    if (e.area === "trip") {
      for (const ep of e.entry_places) {
        if (ep.places.country_code) countries.add(ep.places.country_code);
      }
    } else if (e.area === "book" && row.kind === "finish") {
      books.add(e.id);
    } else if (e.area === "movie") {
      movies.add(e.id);
    } else if (e.area === "concert") {
      concerts.add(e.id);
    }
  }
  return {
    year,
    countries: countries.size,
    books: books.size,
    movies: movies.size,
    concerts: concerts.size,
  };
}

export const AREA_META: Record<Area, { icon: string; label: string; href: (e: Entry | RecentItem) => string }> = {
  trip: { icon: "🌍", label: "Trip", href: (e) => `/travel/trip/${e.id}` },
  book: { icon: "📖", label: "Book", href: (e) => `/books/${e.id}` },
  movie: { icon: "🎬", label: "Movie", href: (e) => `/tv/${e.id}` },
  series: { icon: "📺", label: "Series", href: (e) => `/tv/${e.id}` },
  concert: { icon: "🎸", label: "Concert", href: (e) => `/concerts/${e.id}` },
};
