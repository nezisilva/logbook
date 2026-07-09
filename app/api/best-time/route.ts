import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Generates the "best time to visit" blurb for a country/city. Called once
// per place and cached on the places row by the client — never on every view.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 503 }
    );
  }

  // The endpoint costs money per call — only the signed-in owner may use it.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = createClient(url, anonKey);
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { country, city } = await req.json().catch(() => ({}));
  if (typeof country !== "string" || !country.trim()) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }
  const place = typeof city === "string" && city.trim() ? `${city.trim()}, ${country.trim()}` : country.trim();

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `When is the best time of year to visit ${place}? Answer in under 120 words of plain text (no markdown, no headings): the best months and a short reason why, then any months to avoid and why (weather, crowds, prices, or events).`,
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    return NextResponse.json({ error: "The model declined this request" }, { status: 502 });
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) {
    return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
  }
  return NextResponse.json({ text });
}
