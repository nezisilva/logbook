"use client";

import { useRef, useState } from "react";
import { exportAll, importAll, isConfigured } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await exportAll();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logbook-export-${payload.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch (e) {
      setMessage(`Export failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const payload = JSON.parse(await file.text());
      const counts = await importAll(payload);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setMessage(`Restored ${total} rows.`);
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <>
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Your data</h2>
        <p className="muted">
          Export downloads everything as one JSON file. Import restores an export
          into this account — existing items with the same id are overwritten,
          nothing else is touched.
        </p>
        {isConfigured ? (
          <div className="settings-actions">
            <button className="btn" disabled={busy} onClick={doExport}>
              Export all data
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              Import from file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
            />
          </div>
        ) : (
          <p className="muted">Available once Supabase is configured.</p>
        )}
        {message && <p>{message}</p>}
      </section>

      {isConfigured && (
        <section className="settings-section">
          <h2>Account</h2>
          <button className="btn secondary" onClick={signOut}>
            Sign out
          </button>
        </section>
      )}
    </>
  );
}
