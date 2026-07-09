import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Auth-gated proxy for TMDB search — keeps the API key out of the client
// bundle. Returns a trimmed result list; posters stay on TMDB's CDN.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) {
    return NextResponse.json({ error: "TMDB_API_KEY is not set on the server" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = createClient(url, anonKey);
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const query = params.get("query")?.trim();
  const kind = params.get("kind") === "series" ? "tv" : "movie";
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/${kind}?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`
  );
  if (!res.ok) {
    return NextResponse.json({ error: `TMDB returned ${res.status}` }, { status: 502 });
  }
  const json = await res.json();
  type TmdbItem = {
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
  };
  const results = ((json.results ?? []) as TmdbItem[]).slice(0, 8).map((r) => ({
    tmdb_id: r.id,
    title: r.title ?? r.name ?? "",
    year: (r.release_date ?? r.first_air_date ?? "").slice(0, 4) || undefined,
    poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : undefined,
  }));
  return NextResponse.json({ results });
}
