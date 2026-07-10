"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ConcertForm from "@/components/ConcertForm";

export default function EditConcert() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Link href="/concerts" className="backlink">
        ← Concerts
      </Link>
      <h1>Edit concert</h1>
      <ConcertForm concertId={id} />
    </>
  );
}
