import { supabase } from "./supabase";
import type { BookDetails } from "./books";

// Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

export interface GoodreadsBook {
  title: string;
  author: string;
  isbn: string;
  rating: number | null; // half-stars 1–10
  pages: number | undefined;
  status: string; // want | reading | done
  date_read: string | null; // ISO
  review: string;
  book_type: BookDetails["book_type"];
  owned: boolean;
}

// Goodreads always exports these column headers.
const SHELF_TO_STATUS: Record<string, string> = {
  "to-read": "want",
  "currently-reading": "reading",
  read: "done",
};

function cleanIsbn(raw: string): string {
  // Goodreads wraps ISBNs as ="9781234567890" to keep Excel happy
  return raw.replace(/[="]/g, "").trim();
}

export function parseGoodreadsCsv(text: string): GoodreadsBook[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const col = (name: string) => header.indexOf(name);
  const iTitle = col("Title");
  const iAuthor = col("Author");
  if (iTitle === -1 || iAuthor === -1) {
    throw new Error("This doesn't look like a Goodreads export (no Title/Author columns).");
  }
  const iIsbn13 = col("ISBN13");
  const iIsbn = col("ISBN");
  const iRating = col("My Rating");
  const iPages = col("Number of Pages");
  const iDateRead = col("Date Read");
  const iShelf = col("Exclusive Shelf");
  const iReview = col("My Review");
  const iBinding = col("Binding");
  const iOwned = col("Owned Copies");

  const books: GoodreadsBook[] = [];
  for (const row of rows.slice(1)) {
    const title = row[iTitle]?.trim();
    if (!title) continue;
    const shelf = iShelf >= 0 ? row[iShelf]?.trim() : "read";
    const rating = iRating >= 0 ? Number(row[iRating]) : 0;
    const pages = iPages >= 0 ? Number(row[iPages]) : NaN;
    const binding = iBinding >= 0 ? (row[iBinding] ?? "").toLowerCase() : "";
    const dateRead = iDateRead >= 0 ? row[iDateRead]?.trim() : "";
    books.push({
      title,
      author: row[iAuthor]?.trim() ?? "",
      isbn: cleanIsbn((iIsbn13 >= 0 && row[iIsbn13]) || (iIsbn >= 0 && row[iIsbn]) || ""),
      rating: rating > 0 ? rating * 2 : null,
      pages: Number.isFinite(pages) && pages > 0 ? pages : undefined,
      status: SHELF_TO_STATUS[shelf] ?? "done",
      date_read: dateRead ? dateRead.replace(/\//g, "-") : null,
      review: iReview >= 0 ? (row[iReview] ?? "").trim() : "",
      book_type: binding.includes("audio")
        ? "audiobook"
        : binding.includes("kindle") || binding.includes("ebook")
          ? "ebook"
          : "physical",
      owned: iOwned >= 0 && Number(row[iOwned]) > 0,
    });
  }
  return books;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/** Imports parsed Goodreads rows, skipping titles that already exist. */
export async function importGoodreads(
  books: GoodreadsBook[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  if (!supabase) throw new Error("Supabase is not configured");

  // dedupe against existing book titles (paged, titles only — cheap)
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("entries")
      .select("title")
      .eq("area", "book")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) existing.add(row.title.toLowerCase());
    if (data.length < 1000) break;
  }

  const fresh = books.filter((b) => !existing.has(b.title.toLowerCase()));
  let imported = 0;
  const CHUNK = 50;
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const chunk = fresh.slice(i, i + CHUNK);
    const { data: inserted, error } = await supabase
      .from("entries")
      .insert(
        chunk.map((b) => ({
          area: "book",
          title: b.title,
          status: b.status,
          rating: b.rating,
          notes: b.review || null,
          details: {
            author: b.author || undefined,
            isbn: b.isbn || undefined,
            pages: b.pages,
            book_type: b.book_type,
            owned: b.owned || undefined,
          } satisfies BookDetails,
        }))
      )
      .select("id");
    if (error) throw error;

    const dates = inserted.flatMap((row, j) =>
      chunk[j].date_read ? [{ entry_id: row.id, date: chunk[j].date_read, kind: "finish" }] : []
    );
    if (dates.length > 0) {
      const { error: dateError } = await supabase.from("entry_dates").insert(dates);
      if (dateError) throw dateError;
    }
    imported += chunk.length;
    onProgress?.(imported, fresh.length);
  }
  return { imported, skipped: books.length - fresh.length };
}
