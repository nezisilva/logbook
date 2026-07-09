"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import BookForm from "@/components/BookForm";

export default function EditBook() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Link href="/books" className="backlink">
        ← Books
      </Link>
      <h1>Edit book</h1>
      <BookForm bookId={id} />
    </>
  );
}
