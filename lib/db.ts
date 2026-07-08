import { supabase } from "./supabase";
import type { Area, Entry, ExportPayload, Person } from "./types";

export const isConfigured = supabase !== null;

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

// ---------- people ----------

export async function listPeople(): Promise<Person[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("people").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createPerson(name: string): Promise<Person> {
  const { data, error } = await db().from("people").insert({ name }).select().single();
  if (error) throw error;
  return data;
}

// ---------- entries (generic item pattern) ----------

export interface ListEntriesOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function listEntries(area: Area, opts: ListEntriesOptions = {}): Promise<Entry[]> {
  if (!supabase) return [];
  const { status, limit = 50, offset = 0 } = opts;
  let q = supabase
    .from("entries")
    .select("*")
    .eq("area", area)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createEntry(
  entry: Pick<Entry, "area" | "title" | "status"> & Partial<Entry>
): Promise<Entry> {
  const { data, error } = await db().from("entries").insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id: string, patch: Partial<Entry>): Promise<Entry> {
  const { data, error } = await db().from("entries").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await db().from("entries").delete().eq("id", id);
  if (error) throw error;
}

export async function setEntryPeople(entryId: string, role: string, personIds: string[]): Promise<void> {
  const client = db();
  const del = await client.from("entry_people").delete().eq("entry_id", entryId).eq("role", role);
  if (del.error) throw del.error;
  if (personIds.length === 0) return;
  const ins = await client
    .from("entry_people")
    .insert(personIds.map((person_id) => ({ entry_id: entryId, person_id, role })));
  if (ins.error) throw ins.error;
}

export async function setEntryDates(
  entryId: string,
  dates: { date: string; kind?: string; note?: string }[]
): Promise<void> {
  const client = db();
  const del = await client.from("entry_dates").delete().eq("entry_id", entryId);
  if (del.error) throw del.error;
  if (dates.length === 0) return;
  const ins = await client
    .from("entry_dates")
    .insert(dates.map((d) => ({ entry_id: entryId, ...d })));
  if (ins.error) throw ins.error;
}

// ---------- export / import ----------

// Ordered so foreign-key parents restore before children.
const TABLES = ["people", "places", "entries", "entry_people", "entry_dates", "entry_places"];
const PAGE = 1000;

export async function exportAll(): Promise<ExportPayload> {
  const client = db();
  const data: ExportPayload["data"] = {};
  for (const table of TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: chunk, error } = await client.from(table).select("*").range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...chunk);
      if (chunk.length < PAGE) break;
    }
    data[table] = rows;
  }
  return { app: "logbook", version: 1, exported_at: new Date().toISOString(), data };
}

/** Restores an export into the current account. Upserts by id: existing rows
 * are overwritten, rows created since the export are left alone. */
export async function importAll(payload: ExportPayload): Promise<Record<string, number>> {
  if (payload.app !== "logbook" || payload.version !== 1 || typeof payload.data !== "object") {
    throw new Error("Not a Logbook export file");
  }
  const client = db();
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    // owner_id is stripped so the column default (auth.uid()) reassigns rows
    // to whichever account performs the restore.
    let rows = (payload.data[table] ?? []).map(({ owner_id: _, ...row }) => row);
    counts[table] = rows.length;
    if (table === "places") rows = sortParentsFirst(rows);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await client.from(table).upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  }
  return counts;
}

/** Orders rows so any row's parent_id refers to an earlier row (or null),
 * satisfying the self-referencing FK during insert. */
function sortParentsFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const remaining = [...rows];
  const placed: Record<string, unknown>[] = [];
  const placedIds = new Set<unknown>();
  while (remaining.length > 0) {
    const ready = remaining.filter((r) => !r.parent_id || placedIds.has(r.parent_id));
    // orphaned parents (deleted rows): give up on ordering, FK is `set null`-safe on delete
    // but not on insert, so surface them last and let the DB report the real issue
    const batch = ready.length > 0 ? ready : remaining.splice(0);
    for (const r of batch) {
      placed.push(r);
      placedIds.add(r.id);
      const idx = remaining.indexOf(r);
      if (idx !== -1) remaining.splice(idx, 1);
    }
  }
  return placed;
}
