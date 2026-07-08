"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthState = "loading" | "authed" | "anon";

// Client-side route gate. The real security boundary is Supabase RLS —
// this only decides whether to show the app shell or the login screen.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(supabase ? "loading" : "authed");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "authed" : "anon");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (state === "anon" && pathname !== "/login") router.replace("/login");
    if (state === "authed" && pathname === "/login") router.replace("/");
  }, [state, pathname, router]);

  if (state === "loading") return <div className="splash">Logbook</div>;
  if (state === "anon" && pathname !== "/login") return <div className="splash">Logbook</div>;

  return (
    <>
      {!supabase && (
        <p className="muted" style={{ textAlign: "center", fontSize: "0.75rem", margin: "4px 0 0" }}>
          Supabase not configured — preview mode, no login or data.
        </p>
      )}
      {children}
    </>
  );
}
