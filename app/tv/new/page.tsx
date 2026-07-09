"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WatchForm from "@/components/WatchForm";

function NewWatchInner() {
  const params = useSearchParams();
  const kind = params.get("kind") === "series" ? "series" : "movie";
  return <WatchForm initialKind={kind} />;
}

export default function NewWatch() {
  return (
    <>
      <Link href="/tv" className="backlink">
        ← TV &amp; Movies
      </Link>
      <h1>Add to watch log</h1>
      <Suspense>
        <NewWatchInner />
      </Suspense>
    </>
  );
}
