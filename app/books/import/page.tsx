"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { isConfigured } from "@/lib/db";
import { importGoodreads, parseGoodreadsCsv, type GoodreadsBook } from "@/lib/goodreads";

export default function ImportBooks() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<GoodreadsBook[] | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setParsed(null);
    try {
      const books = parseGoodreadsCsv(await file.text());
      if (books.length === 0) throw new Error("No books found in that file.");
      setParsed(books);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runImport() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const { imported, skipped } = await importGoodreads(parsed, (done, total) =>
        setProgress(`Importing ${done}/${total}…`)
      );
      setResult(
        `Imported ${imported} book${imported === 1 ? "" : "s"}` +
          (skipped > 0 ? `, skipped ${skipped} already in your library.` : ".")
      );
      setParsed(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  const summary =
    parsed &&
    ["done", "want", "reading"]
      .map((s) => ({ s, n: parsed.filter((b) => b.status === s).length }))
      .filter(({ n }) => n > 0)
      .map(({ s, n }) => `${n} ${s === "done" ? "read" : s === "want" ? "want-to-read" : "reading"}`)
      .join(", ");

  return (
    <>
      <Link href="/books" className="backlink">
        ← Books
      </Link>
      <h1>Import from Goodreads</h1>
      <p className="muted">
        On Goodreads: My Books → Import and export → Export Library, then pick the downloaded CSV
        here. Books whose exact title is already in your library are skipped.
      </p>
      {isConfigured ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {parsed && (
            <>
              <p>
                Found <strong>{parsed.length}</strong> books ({summary}).
              </p>
              <button className="btn" disabled={busy} onClick={runImport}>
                {busy ? (progress ?? "Importing…") : `Import ${parsed.length} books`}
              </button>
            </>
          )}
          {result && <p>{result}</p>}
          {error && <p className="error-text">{error}</p>}
        </>
      ) : (
        <p className="muted">Import needs Supabase configured.</p>
      )}
    </>
  );
}
