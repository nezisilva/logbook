"use client";

import Link from "next/link";
import ConcertForm from "@/components/ConcertForm";

export default function NewConcert() {
  return (
    <>
      <Link href="/concerts" className="backlink">
        ← Concerts
      </Link>
      <h1>Add concert</h1>
      <ConcertForm />
    </>
  );
}
