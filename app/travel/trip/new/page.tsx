"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TripForm from "@/components/TripForm";

function NewTripInner() {
  const params = useSearchParams();
  return <TripForm initialCountry={params.get("country") ?? undefined} />;
}

export default function NewTrip() {
  return (
    <>
      <Link href="/travel" className="backlink">
        ← Travel
      </Link>
      <h1>New trip</h1>
      <Suspense>
        <NewTripInner />
      </Suspense>
    </>
  );
}
