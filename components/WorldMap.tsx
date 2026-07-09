"use client";

import { useRouter } from "next/navigation";
import { COUNTRY_PATHS, COUNTRY_POINTS, MAP_W, MAP_H } from "@/lib/world-map";
import { COUNTRIES } from "@/lib/countries";

// SVG choropleth: countries with a 110m outline render as paths; microstates
// too small for that scale render as circle markers. Tap → country page.
export default function WorldMap({ visited }: { visited: Set<string> }) {
  const router = useRouter();
  const go = (code: string) => router.push(`/travel/country/${code}`);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="world-map"
      role="img"
      aria-label="World map of visited countries"
    >
      {COUNTRIES.filter((c) => COUNTRY_PATHS[c.code]).map((c) => (
        <path
          key={c.code}
          d={COUNTRY_PATHS[c.code]}
          className={visited.has(c.code) ? "country visited" : "country"}
          onClick={() => go(c.code)}
        >
          <title>{c.name}</title>
        </path>
      ))}
      {COUNTRIES.filter((c) => !COUNTRY_PATHS[c.code]).map((c) => {
        const [x, y] = COUNTRY_POINTS[c.code];
        return (
          <circle
            key={c.code}
            cx={x}
            cy={y}
            r={4}
            className={
              visited.has(c.code) ? "country marker visited" : "country marker"
            }
            onClick={() => go(c.code)}
          >
            <title>{c.name}</title>
          </circle>
        );
      })}
    </svg>
  );
}
