import { supabase } from "./supabase";
import type { Entry, EntryDate, Person, Place } from "./types";

// Concert-specific fields live in entries.details (area = "concert").
// The lineup is a many-artist list; support acts are flagged separately.
export interface ConcertArtist {
  name: string;
  support?: boolean;
}

export interface ConcertDetails {
  lineup?: ConcertArtist[];
  venue?: string; // display name; also linked as a places row (kind "venue")
  setlist_url?: string;
}

export interface ConcertFull extends Omit<Entry, "details"> {
  details: ConcertDetails;
  entry_people: { person_id: string; role: string; people: Person }[];
  entry_dates: EntryDate[];
  entry_places: { place_id: string; places: Place }[];
}

export const CONCERT_PAGE_SIZE = 30;

export interface ConcertFilters {
  status?: string; // want | done
  search?: string;
  offset?: number;
}

export async function listConcerts(filters: ConcertFilters = {}): Promise<ConcertFull[]> {
  if (!supabase) return [];
  const offset = filters.offset ?? 0;
  let q = supabase
    .from("entries")
    .select(
      "*, entry_people(person_id, role, people(*)), entry_dates(*), entry_places(place_id, places(*))"
    )
    .eq("area", "concert")
    .order("updated_at", { ascending: false })
    .range(offset, offset + CONCERT_PAGE_SIZE - 1);
  if (filters.status) q = q.eq("status", filters.status);
  const s = filters.search?.trim().replace(/[,%]/g, "");
  if (s) q = q.ilike("title", `%${s}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as ConcertFull[];
}

/** Distinct artist names across all concerts, for lineup autocomplete. */
export async function artistNames(): Promise<string[]> {
  if (!supabase) return [];
  const names = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("entries")
      .select("details")
      .eq("area", "concert")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) {
      const lineup = (row.details as ConcertDetails).lineup ?? [];
      for (const a of lineup) names.add(a.name);
    }
    if (data.length < 1000) break;
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function listAllCities(): Promise<Place[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("kind", "city")
    .order("name");
  if (error) throw error;
  return data;
}

/** Finds or creates the venue places row under a city. */
export async function ensureVenuePlace(name: string, city: Place): Promise<Place> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: existing, error: findError } = await supabase
    .from("places")
    .select("*")
    .eq("kind", "venue")
    .eq("parent_id", city.id)
    .ilike("name", name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;
  const { data, error } = await supabase
    .from("places")
    .insert({ kind: "venue", name, parent_id: city.id, country_code: city.country_code })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function headliners(c: ConcertFull): string {
  return (c.details.lineup ?? [])
    .filter((a) => !a.support)
    .map((a) => a.name)
    .join(" + ");
}
