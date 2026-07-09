"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import WatchForm from "@/components/WatchForm";

export default function EditWatch() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Link href="/tv" className="backlink">
        ← TV &amp; Movies
      </Link>
      <h1>Edit</h1>
      <WatchForm watchId={id} />
    </>
  );
}
