"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isConfigured } from "@/lib/db";
import {
  AREA_META,
  recentActivity,
  yearInReview,
  type RecentItem,
  type YearInReview,
} from "@/lib/dashboard";

const QUICK_ADDS = [
  { href: "/travel/trip/new", icon: "🌍", label: "Trip" },
  { href: "/books/new", icon: "📖", label: "Book" },
  { href: "/tv/new", icon: "🎬", label: "Watch" },
  { href: "/concerts/new", icon: "🎸", label: "Concert" },
];

export default function Home() {
  const [review, setReview] = useState<YearInReview | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([yearInReview(), recentActivity()])
      .then(([yr, items]) => {
        setReview(yr);
        setRecent(items);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <>
      <div className="home-header">
        <h1>Logbook</h1>
        <Link href="/settings" aria-label="Settings" className="settings-link">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.21.5.72.86 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97z" />
          </svg>
        </Link>
      </div>

      <div className="quickadds">
        {QUICK_ADDS.map((q) => (
          <Link key={q.href} href={q.href} className="quickadd">
            <span aria-hidden="true">{q.icon}</span>+ {q.label}
          </Link>
        ))}
      </div>

      {review && (
        <>
          <h2>{review.year} so far</h2>
          <div className="statgrid">
            <Link href="/travel" className="stat">
              <strong>{review.countries}</strong>
              <span>countries</span>
            </Link>
            <Link href="/books" className="stat">
              <strong>{review.books}</strong>
              <span>books read</span>
            </Link>
            <Link href="/tv" className="stat">
              <strong>{review.movies}</strong>
              <span>movies</span>
            </Link>
            <Link href="/concerts" className="stat">
              <strong>{review.concerts}</strong>
              <span>concerts</span>
            </Link>
          </div>
        </>
      )}

      <h2>Recent</h2>
      {!isConfigured && <p className="muted">The dashboard fills in once Supabase is configured.</p>}
      {isConfigured && loaded && recent.length === 0 && (
        <p className="muted">Nothing logged yet — use the buttons above to add your first entry.</p>
      )}
      <ul className="itemlist">
        {recent.map((item) => {
          const meta = AREA_META[item.area];
          return (
            <li key={item.id}>
              <Link href={meta.href(item)} className="recentrow">
                <span className="recent-icon" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="bookrow-main">
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {meta.label} · {item.status} · {item.updated_at.slice(0, 10)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
