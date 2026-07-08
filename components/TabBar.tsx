"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /> },
  {
    href: "/travel",
    label: "Travel",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z" />
      </>
    ),
  },
  {
    href: "/books",
    label: "Books",
    icon: <path d="M5 4h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5zM19 4h-6a0 0 0 0 0 0 0v15a0 0 0 0 1 0 0h6z M13 6a2 2 0 0 1 2-2h4v13h-4a2 2 0 0 0-2 2" />,
  },
  {
    href: "/tv",
    label: "TV & Movies",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M10 9.5l4 2.5-4 2.5z" />
      </>
    ),
  },
  {
    href: "/concerts",
    label: "Concerts",
    icon: (
      <>
        <path d="M9 18V6l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
      </>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={isActive(tab.href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            {tab.icon}
          </svg>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
