// Generates lib/countries.ts and lib/world-map.ts from the public-domain
// Natural Earth 110m dataset (world-atlas). Run once (or when the country
// table below changes): `node scripts/build-world-map.mjs`.
//
// No dependencies: decodes TopoJSON and projects with Equal Earth by hand.
// The 195 = 193 UN members + 2 observer states (Vatican, Palestine).
import { writeFileSync } from "node:fs";
import path from "node:path";

const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

// [iso numeric, alpha-2, name, continent, lat, lng] — lat/lng are rough
// centroids/capitals used for map markers and (later) distance stats.
const COUNTRIES = [
  // Africa (54)
  ["012", "DZ", "Algeria", "Africa", 28.0, 1.7],
  ["024", "AO", "Angola", "Africa", -11.2, 17.9],
  ["204", "BJ", "Benin", "Africa", 9.3, 2.3],
  ["072", "BW", "Botswana", "Africa", -22.3, 24.7],
  ["854", "BF", "Burkina Faso", "Africa", 12.2, -1.6],
  ["108", "BI", "Burundi", "Africa", -3.4, 29.9],
  ["132", "CV", "Cabo Verde", "Africa", 15.1, -23.6],
  ["120", "CM", "Cameroon", "Africa", 7.4, 12.4],
  ["140", "CF", "Central African Republic", "Africa", 6.6, 20.9],
  ["148", "TD", "Chad", "Africa", 15.5, 18.7],
  ["174", "KM", "Comoros", "Africa", -11.6, 43.9],
  ["178", "CG", "Congo", "Africa", -0.2, 15.8],
  ["180", "CD", "DR Congo", "Africa", -4.0, 21.8],
  ["384", "CI", "Côte d'Ivoire", "Africa", 7.5, -5.5],
  ["262", "DJ", "Djibouti", "Africa", 11.8, 42.6],
  ["818", "EG", "Egypt", "Africa", 26.8, 30.8],
  ["226", "GQ", "Equatorial Guinea", "Africa", 1.7, 10.3],
  ["232", "ER", "Eritrea", "Africa", 15.2, 39.8],
  ["748", "SZ", "Eswatini", "Africa", -26.5, 31.5],
  ["231", "ET", "Ethiopia", "Africa", 9.1, 40.5],
  ["266", "GA", "Gabon", "Africa", -0.8, 11.6],
  ["270", "GM", "Gambia", "Africa", 13.4, -15.3],
  ["288", "GH", "Ghana", "Africa", 7.9, -1.0],
  ["324", "GN", "Guinea", "Africa", 9.9, -9.7],
  ["624", "GW", "Guinea-Bissau", "Africa", 11.8, -15.2],
  ["404", "KE", "Kenya", "Africa", -0.0, 37.9],
  ["426", "LS", "Lesotho", "Africa", -29.6, 28.2],
  ["430", "LR", "Liberia", "Africa", 6.4, -9.4],
  ["434", "LY", "Libya", "Africa", 26.3, 17.2],
  ["450", "MG", "Madagascar", "Africa", -18.8, 47.0],
  ["454", "MW", "Malawi", "Africa", -13.3, 34.3],
  ["466", "ML", "Mali", "Africa", 17.6, -4.0],
  ["478", "MR", "Mauritania", "Africa", 21.0, -10.9],
  ["480", "MU", "Mauritius", "Africa", -20.3, 57.6],
  ["504", "MA", "Morocco", "Africa", 31.8, -7.1],
  ["508", "MZ", "Mozambique", "Africa", -18.7, 35.5],
  ["516", "NA", "Namibia", "Africa", -22.9, 18.5],
  ["562", "NE", "Niger", "Africa", 17.6, 8.1],
  ["566", "NG", "Nigeria", "Africa", 9.1, 8.7],
  ["646", "RW", "Rwanda", "Africa", -1.9, 29.9],
  ["678", "ST", "São Tomé and Príncipe", "Africa", 0.2, 6.6],
  ["686", "SN", "Senegal", "Africa", 14.5, -14.5],
  ["690", "SC", "Seychelles", "Africa", -4.7, 55.5],
  ["694", "SL", "Sierra Leone", "Africa", 8.5, -11.8],
  ["706", "SO", "Somalia", "Africa", 5.2, 46.2],
  ["710", "ZA", "South Africa", "Africa", -30.6, 22.9],
  ["728", "SS", "South Sudan", "Africa", 6.9, 31.3],
  ["729", "SD", "Sudan", "Africa", 15.6, 30.2],
  ["834", "TZ", "Tanzania", "Africa", -6.4, 34.9],
  ["768", "TG", "Togo", "Africa", 8.6, 1.0],
  ["788", "TN", "Tunisia", "Africa", 33.9, 9.5],
  ["800", "UG", "Uganda", "Africa", 1.4, 32.3],
  ["894", "ZM", "Zambia", "Africa", -13.1, 27.8],
  ["716", "ZW", "Zimbabwe", "Africa", -19.0, 29.2],
  // Asia (47)
  ["004", "AF", "Afghanistan", "Asia", 33.9, 67.7],
  ["051", "AM", "Armenia", "Asia", 40.1, 45.0],
  ["031", "AZ", "Azerbaijan", "Asia", 40.1, 47.6],
  ["048", "BH", "Bahrain", "Asia", 26.1, 50.6],
  ["050", "BD", "Bangladesh", "Asia", 23.7, 90.4],
  ["064", "BT", "Bhutan", "Asia", 27.5, 90.4],
  ["096", "BN", "Brunei", "Asia", 4.5, 114.7],
  ["116", "KH", "Cambodia", "Asia", 12.6, 105.0],
  ["156", "CN", "China", "Asia", 35.9, 104.2],
  ["268", "GE", "Georgia", "Asia", 42.3, 43.4],
  ["356", "IN", "India", "Asia", 20.6, 79.0],
  ["360", "ID", "Indonesia", "Asia", -0.8, 113.9],
  ["364", "IR", "Iran", "Asia", 32.4, 53.7],
  ["368", "IQ", "Iraq", "Asia", 33.2, 43.7],
  ["376", "IL", "Israel", "Asia", 31.0, 34.9],
  ["392", "JP", "Japan", "Asia", 36.2, 138.3],
  ["400", "JO", "Jordan", "Asia", 30.6, 36.2],
  ["398", "KZ", "Kazakhstan", "Asia", 48.0, 66.9],
  ["414", "KW", "Kuwait", "Asia", 29.3, 47.5],
  ["417", "KG", "Kyrgyzstan", "Asia", 41.2, 74.8],
  ["418", "LA", "Laos", "Asia", 19.9, 102.5],
  ["422", "LB", "Lebanon", "Asia", 33.9, 35.9],
  ["458", "MY", "Malaysia", "Asia", 4.2, 102.0],
  ["462", "MV", "Maldives", "Asia", 3.2, 73.2],
  ["496", "MN", "Mongolia", "Asia", 46.9, 103.8],
  ["104", "MM", "Myanmar", "Asia", 21.9, 95.9],
  ["524", "NP", "Nepal", "Asia", 28.4, 84.1],
  ["408", "KP", "North Korea", "Asia", 40.3, 127.5],
  ["512", "OM", "Oman", "Asia", 21.5, 55.9],
  ["586", "PK", "Pakistan", "Asia", 30.4, 69.3],
  ["275", "PS", "Palestine", "Asia", 31.9, 35.2],
  ["608", "PH", "Philippines", "Asia", 12.9, 121.8],
  ["634", "QA", "Qatar", "Asia", 25.4, 51.2],
  ["682", "SA", "Saudi Arabia", "Asia", 23.9, 45.1],
  ["702", "SG", "Singapore", "Asia", 1.35, 103.8],
  ["410", "KR", "South Korea", "Asia", 35.9, 127.8],
  ["144", "LK", "Sri Lanka", "Asia", 7.9, 80.8],
  ["760", "SY", "Syria", "Asia", 34.8, 39.0],
  ["762", "TJ", "Tajikistan", "Asia", 38.9, 71.3],
  ["764", "TH", "Thailand", "Asia", 15.9, 101.0],
  ["626", "TL", "Timor-Leste", "Asia", -8.9, 125.7],
  ["792", "TR", "Turkey", "Asia", 38.96, 35.2],
  ["795", "TM", "Turkmenistan", "Asia", 38.97, 59.6],
  ["784", "AE", "United Arab Emirates", "Asia", 23.4, 53.8],
  ["860", "UZ", "Uzbekistan", "Asia", 41.4, 64.6],
  ["704", "VN", "Vietnam", "Asia", 14.1, 108.3],
  ["887", "YE", "Yemen", "Asia", 15.6, 48.5],
  // Europe (45)
  ["008", "AL", "Albania", "Europe", 41.2, 20.2],
  ["020", "AD", "Andorra", "Europe", 42.5, 1.6],
  ["040", "AT", "Austria", "Europe", 47.5, 14.6],
  ["112", "BY", "Belarus", "Europe", 53.7, 28.0],
  ["056", "BE", "Belgium", "Europe", 50.5, 4.5],
  ["070", "BA", "Bosnia and Herzegovina", "Europe", 43.9, 17.7],
  ["100", "BG", "Bulgaria", "Europe", 42.7, 25.5],
  ["191", "HR", "Croatia", "Europe", 45.1, 15.2],
  ["196", "CY", "Cyprus", "Europe", 35.1, 33.4],
  ["203", "CZ", "Czechia", "Europe", 49.8, 15.5],
  ["208", "DK", "Denmark", "Europe", 56.3, 9.5],
  ["233", "EE", "Estonia", "Europe", 58.6, 25.0],
  ["246", "FI", "Finland", "Europe", 61.9, 25.7],
  ["250", "FR", "France", "Europe", 46.2, 2.2],
  ["276", "DE", "Germany", "Europe", 51.2, 10.5],
  ["300", "GR", "Greece", "Europe", 39.1, 21.8],
  ["348", "HU", "Hungary", "Europe", 47.2, 19.5],
  ["352", "IS", "Iceland", "Europe", 64.96, -19.0],
  ["372", "IE", "Ireland", "Europe", 53.4, -8.2],
  ["380", "IT", "Italy", "Europe", 41.9, 12.6],
  ["428", "LV", "Latvia", "Europe", 56.9, 24.6],
  ["438", "LI", "Liechtenstein", "Europe", 47.2, 9.6],
  ["440", "LT", "Lithuania", "Europe", 55.2, 23.9],
  ["442", "LU", "Luxembourg", "Europe", 49.8, 6.1],
  ["470", "MT", "Malta", "Europe", 35.9, 14.4],
  ["498", "MD", "Moldova", "Europe", 47.4, 28.4],
  ["492", "MC", "Monaco", "Europe", 43.7, 7.4],
  ["499", "ME", "Montenegro", "Europe", 42.7, 19.4],
  ["528", "NL", "Netherlands", "Europe", 52.1, 5.3],
  ["807", "MK", "North Macedonia", "Europe", 41.6, 21.7],
  ["578", "NO", "Norway", "Europe", 60.5, 8.5],
  ["616", "PL", "Poland", "Europe", 51.9, 19.1],
  ["620", "PT", "Portugal", "Europe", 39.4, -8.2],
  ["642", "RO", "Romania", "Europe", 45.9, 25.0],
  ["643", "RU", "Russia", "Europe", 61.5, 105.3],
  ["674", "SM", "San Marino", "Europe", 43.9, 12.5],
  ["688", "RS", "Serbia", "Europe", 44.0, 21.0],
  ["703", "SK", "Slovakia", "Europe", 48.7, 19.7],
  ["705", "SI", "Slovenia", "Europe", 46.2, 15.0],
  ["724", "ES", "Spain", "Europe", 40.5, -3.7],
  ["752", "SE", "Sweden", "Europe", 60.1, 18.6],
  ["756", "CH", "Switzerland", "Europe", 46.8, 8.2],
  ["804", "UA", "Ukraine", "Europe", 48.4, 31.2],
  ["826", "GB", "United Kingdom", "Europe", 55.4, -3.4],
  ["336", "VA", "Vatican City", "Europe", 41.9, 12.45],
  // North America (23)
  ["028", "AG", "Antigua and Barbuda", "North America", 17.1, -61.8],
  ["044", "BS", "Bahamas", "North America", 25.0, -77.4],
  ["052", "BB", "Barbados", "North America", 13.2, -59.5],
  ["084", "BZ", "Belize", "North America", 17.2, -88.5],
  ["124", "CA", "Canada", "North America", 56.1, -106.3],
  ["188", "CR", "Costa Rica", "North America", 9.7, -83.8],
  ["192", "CU", "Cuba", "North America", 21.5, -77.8],
  ["212", "DM", "Dominica", "North America", 15.4, -61.4],
  ["214", "DO", "Dominican Republic", "North America", 18.7, -70.2],
  ["222", "SV", "El Salvador", "North America", 13.8, -88.9],
  ["308", "GD", "Grenada", "North America", 12.1, -61.7],
  ["320", "GT", "Guatemala", "North America", 15.8, -90.2],
  ["332", "HT", "Haiti", "North America", 19.0, -72.3],
  ["340", "HN", "Honduras", "North America", 15.2, -86.2],
  ["388", "JM", "Jamaica", "North America", 18.1, -77.3],
  ["484", "MX", "Mexico", "North America", 23.6, -102.6],
  ["558", "NI", "Nicaragua", "North America", 12.9, -85.2],
  ["591", "PA", "Panama", "North America", 8.5, -80.8],
  ["659", "KN", "Saint Kitts and Nevis", "North America", 17.4, -62.8],
  ["662", "LC", "Saint Lucia", "North America", 13.9, -61.0],
  ["670", "VC", "Saint Vincent and the Grenadines", "North America", 13.3, -61.2],
  ["780", "TT", "Trinidad and Tobago", "North America", 10.7, -61.2],
  ["840", "US", "United States", "North America", 37.1, -95.7],
  // South America (12)
  ["032", "AR", "Argentina", "South America", -38.4, -63.6],
  ["068", "BO", "Bolivia", "South America", -16.3, -63.6],
  ["076", "BR", "Brazil", "South America", -14.2, -51.9],
  ["152", "CL", "Chile", "South America", -35.7, -71.5],
  ["170", "CO", "Colombia", "South America", 4.6, -74.3],
  ["218", "EC", "Ecuador", "South America", -1.8, -78.2],
  ["328", "GY", "Guyana", "South America", 4.9, -58.9],
  ["600", "PY", "Paraguay", "South America", -23.4, -58.4],
  ["604", "PE", "Peru", "South America", -9.2, -75.0],
  ["740", "SR", "Suriname", "South America", 3.9, -56.0],
  ["858", "UY", "Uruguay", "South America", -32.5, -55.8],
  ["862", "VE", "Venezuela", "South America", 6.4, -66.6],
  // Oceania (14)
  ["036", "AU", "Australia", "Oceania", -25.3, 133.8],
  ["242", "FJ", "Fiji", "Oceania", -17.7, 178.1],
  ["296", "KI", "Kiribati", "Oceania", 1.87, -157.4],
  ["584", "MH", "Marshall Islands", "Oceania", 7.1, 171.2],
  ["583", "FM", "Micronesia", "Oceania", 6.9, 158.2],
  ["520", "NR", "Nauru", "Oceania", -0.5, 166.9],
  ["554", "NZ", "New Zealand", "Oceania", -40.9, 174.9],
  ["585", "PW", "Palau", "Oceania", 7.5, 134.6],
  ["598", "PG", "Papua New Guinea", "Oceania", -6.3, 143.96],
  ["882", "WS", "Samoa", "Oceania", -13.8, -172.1],
  ["090", "SB", "Solomon Islands", "Oceania", -9.6, 160.2],
  ["776", "TO", "Tonga", "Oceania", -21.2, -175.2],
  ["798", "TV", "Tuvalu", "Oceania", -7.1, 177.6],
  ["548", "VU", "Vanuatu", "Oceania", -15.4, 166.9],
];

if (COUNTRIES.length !== 195) {
  throw new Error(`Expected 195 countries, got ${COUNTRIES.length}`);
}

// ---- Equal Earth projection (Šavrič et al. 2018) ----
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const M = Math.sqrt(3) / 2;

function project(lngDeg, latDeg) {
  const lambda = (lngDeg * Math.PI) / 180;
  const phi = (latDeg * Math.PI) / 180;
  const l = Math.asin(M * Math.sin(phi));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  return [
    (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
    l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
  ];
}

// ---- TopoJSON decoding ----
console.log(`Downloading ${ATLAS_URL} ...`);
const topo = await (await fetch(ATLAS_URL)).json();
const { scale, translate } = topo.transform;

// decode all arcs to lng/lat coordinate arrays
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});

function ringFromArcIndexes(indexes) {
  const points = [];
  for (const idx of indexes) {
    const arc = idx >= 0 ? arcs[idx] : [...arcs[~idx]].reverse();
    // consecutive arcs share endpoints; drop the duplicate
    points.push(...(points.length ? arc.slice(1) : arc));
  }
  return points;
}

const byNumeric = new Map(COUNTRIES.map((c) => [c[0], c]));
const geometries = topo.objects.countries.geometries;

// ---- project everything, collect bounds ----
const rawPaths = new Map(); // alpha2 → array of projected rings
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

const track = ([x, y]) => {
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
};

for (const geom of geometries) {
  const country = byNumeric.get(String(geom.id).padStart(3, "0"));
  if (!country) continue; // Antarctica, non-UN territories
  const polygons = geom.type === "Polygon" ? [geom.arcs] : geom.arcs;
  const rings = [];
  for (const polygon of polygons) {
    for (const ringIdx of polygon) {
      const ring = ringFromArcIndexes(ringIdx).map(([lng, lat]) => {
        const p = project(lng, lat);
        track(p);
        return p;
      });
      rings.push(ring);
    }
  }
  rawPaths.set(country[1], rings);
}

// projected centroids for every country (markers for map-less microstates)
const rawPoints = new Map();
for (const [, alpha2, , , lat, lng] of COUNTRIES) {
  const p = project(lng, lat);
  track(p);
  rawPoints.set(alpha2, p);
}

// ---- scale to a 1000-wide viewBox, y flipped for SVG ----
const WIDTH = 1000;
const k = WIDTH / (maxX - minX);
const HEIGHT = Math.round((maxY - minY) * k);
const tx = (x) => ((x - minX) * k).toFixed(1);
const ty = (y) => ((maxY - y) * k).toFixed(1);

const pathEntries = [];
for (const [alpha2, rings] of rawPaths) {
  let d = "";
  for (const ring of rings) {
    d += `M${tx(ring[0][0])},${ty(ring[0][1])}`;
    for (let i = 1; i < ring.length; i++) {
      d += `L${tx(ring[i][0])},${ty(ring[i][1])}`;
    }
    d += "Z";
  }
  pathEntries.push([alpha2, d]);
}
pathEntries.sort((a, b) => a[0].localeCompare(b[0]));

const pointEntries = [...rawPoints]
  .map(([alpha2, [x, y]]) => [alpha2, [Number(tx(x)), Number(ty(y))]])
  .sort((a, b) => a[0].localeCompare(b[0]));

// ---- emit lib/world-map.ts ----
const mapTs = `// AUTO-GENERATED by scripts/build-world-map.mjs — do not edit by hand.
// Natural Earth 110m via world-atlas (public domain), Equal Earth projection.
export const MAP_W = ${WIDTH};
export const MAP_H = ${HEIGHT};

/** SVG path per ISO alpha-2 code (countries too small for 110m have none). */
export const COUNTRY_PATHS: Record<string, string> = {
${pathEntries.map(([c, d]) => `  ${c}: "${d}",`).join("\n")}
};

/** Projected [x, y] centroid for every UN country (markers, labels). */
export const COUNTRY_POINTS: Record<string, [number, number]> = {
${pointEntries.map(([c, [x, y]]) => `  ${c}: [${x}, ${y}],`).join("\n")}
};
`;

// ---- emit lib/countries.ts ----
const countriesTs = `// AUTO-GENERATED by scripts/build-world-map.mjs — do not edit by hand.
// The 195 UN-recognized countries (193 members + Vatican City + Palestine).
export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania";

export interface Country {
  code: string;
  name: string;
  continent: Continent;
  lat: number;
  lng: number;
}

export const TOTAL_COUNTRIES = 195;

export const COUNTRIES: Country[] = [
${COUNTRIES.map(
  ([, code, name, continent, lat, lng]) =>
    `  { code: "${code}", name: "${name.replace(/"/g, '\\"')}", continent: "${continent}", lat: ${lat}, lng: ${lng} },`
).join("\n")}
];

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export const CONTINENTS: Continent[] = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];

export const CONTINENT_TOTALS: Record<Continent, number> = COUNTRIES.reduce(
  (acc, c) => ((acc[c.continent] = (acc[c.continent] ?? 0) + 1), acc),
  {} as Record<Continent, number>
);
`;

const outMap = path.resolve("lib/world-map.ts");
const outCountries = path.resolve("lib/countries.ts");
writeFileSync(outMap, mapTs);
writeFileSync(outCountries, countriesTs);
console.log(`wrote ${outMap} (${(mapTs.length / 1024).toFixed(0)} KB, ${pathEntries.length} paths)`);
console.log(`wrote ${outCountries} (${(countriesTs.length / 1024).toFixed(0)} KB)`);
const missing = COUNTRIES.filter(([, a2]) => !rawPaths.has(a2)).map(([, a2]) => a2);
console.log(`countries without a 110m path (rendered as markers): ${missing.join(", ")}`);
