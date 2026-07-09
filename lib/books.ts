import { supabase } from "./supabase";
import type { Entry, EntryDate, Person } from "./types";

// Book-specific fields live in entries.details (area = "book").
export interface BookDetails {
  author?: string;
  isbn?: string;
  cover_url?: string;
  pages?: number;
  series?: string;
  series_order?: number;
  book_type?: "physical" | "ebook" | "audiobook";
  narrator?: string;
  length?: string; // audiobook runtime, e.g. "11h 32m"
  progress?: string; // currently-reading progress, e.g. "p. 214" or "62%"
  owned?: boolean;
  location?: string; // shelf / house
  source_kind?: string; // bought | online | borrowed | gift
  source_house?: string; // e.g. "parents' house"
  want_source?: string; // owned | friend | buy | library
}

// People roles used by books:
//   lent_by      — who I borrowed my copy from
//   has_my_copy  — who currently has my copy (lending tracker)
//   friend_owns  — which friend owns it (want-to-read source)
export const BOOK_ROLES = ["lent_by", "has_my_copy", "friend_owns"] as const;

export interface BookFull extends Omit<Entry, "details"> {
  details: BookDetails;
  entry_people: { person_id: string; role: string; people: Person }[];
  entry_dates: EntryDate[];
}

export const BOOK_PAGE_SIZE = 30;

export interface BookFilters {
  status?: string; // want | reading | done | dnf
  type?: string; // physical | ebook | audiobook
  owned?: boolean;
  search?: string;
  offset?: number;
}

export async function listBooks(filters: BookFilters = {}): Promise<BookFull[]> {
  if (!supabase) return [];
  const offset = filters.offset ?? 0;
  let q = supabase
    .from("entries")
    .select("*, entry_people(person_id, role, people(*)), entry_dates(*)")
    .eq("area", "book")
    .order("updated_at", { ascending: false })
    .range(offset, offset + BOOK_PAGE_SIZE - 1);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.type) q = q.eq("details->>book_type", filters.type);
  if (filters.owned) q = q.eq("details->>owned", "true");
  const s = filters.search?.trim().replace(/[,%]/g, "");
  if (s) q = q.or(`title.ilike.%${s}%,details->>author.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as BookFull[];
}

export async function booksFinishedThisYear(): Promise<number> {
  if (!supabase) return 0;
  const year = new Date().getFullYear();
  const { count, error } = await supabase
    .from("entry_dates")
    .select("entry_id, entries!inner(area, status)", { count: "exact", head: true })
    .eq("kind", "finish")
    .gte("date", `${year}-01-01`)
    .eq("entries.area", "book")
    .eq("entries.status", "done");
  if (error) throw error;
  return count ?? 0;
}

// ---------- ISBN autofill (keyless public APIs; cover as external URL) ----------

export interface IsbnResult {
  title?: string;
  author?: string;
  pages?: number;
  cover_url?: string;
}

export async function isbnLookup(isbnRaw: string): Promise<IsbnResult | null> {
  const isbn = isbnRaw.replace(/[-\s]/g, "");
  if (!isbn) return null;

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    const v = json.items?.[0]?.volumeInfo;
    if (v?.title) {
      return {
        title: v.title,
        author: Array.isArray(v.authors) ? v.authors.join(", ") : undefined,
        pages: typeof v.pageCount === "number" && v.pageCount > 0 ? v.pageCount : undefined,
        cover_url: v.imageLinks?.thumbnail?.replace(/^http:/, "https:"),
      };
    }
  } catch {
    // fall through to Open Library
  }

  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const json = await res.json();
    const d = json[`ISBN:${isbn}`];
    if (d?.title) {
      return {
        title: d.title,
        author: Array.isArray(d.authors)
          ? d.authors.map((a: { name: string }) => a.name).join(", ")
          : undefined,
        pages: typeof d.number_of_pages === "number" ? d.number_of_pages : undefined,
        cover_url: d.cover?.medium,
      };
    }
  } catch {
    // no luck anywhere
  }
  return null;
}
