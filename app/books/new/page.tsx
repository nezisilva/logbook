"use client";

import Link from "next/link";
import BookForm from "@/components/BookForm";

export default function NewBook() {
  return (
    <>
      <Link href="/books" className="backlink">
        ← Books
      </Link>
      <h1>Add book</h1>
      <BookForm />
    </>
  );
}
