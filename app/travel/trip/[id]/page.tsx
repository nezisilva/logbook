"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import TripForm from "@/components/TripForm";

export default function EditTrip() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Link href="/travel" className="backlink">
        ← Travel
      </Link>
      <h1>Edit trip</h1>
      <TripForm tripId={id} />
    </>
  );
}
