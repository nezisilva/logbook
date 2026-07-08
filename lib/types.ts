export type Area = "trip" | "book" | "movie" | "series" | "concert";

export interface Person {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export type PlaceKind = "country" | "city" | "venue";

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  country_code: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  area: Area;
  title: string;
  status: string;
  /** half-stars: 1–10 = 0.5–5 stars */
  rating: number | null;
  notes: string | null;
  source: string | null;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DateKind = "on" | "start" | "finish" | "planned";

export interface EntryDate {
  id: string;
  entry_id: string;
  date: string;
  kind: DateKind;
  note: string | null;
}

export interface EntryPerson {
  entry_id: string;
  person_id: string;
  role: string;
}

export interface EntryPlace {
  entry_id: string;
  place_id: string;
}

export interface ExportPayload {
  app: "logbook";
  version: 1;
  exported_at: string;
  data: Record<string, Record<string, unknown>[]>;
}
