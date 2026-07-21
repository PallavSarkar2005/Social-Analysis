/**
 * One-shot: convert India GeoJSON → compact pre-projected SVG paths for the frontend map.
 * Source: %TEMP%/india_states.geojson (geohacker/india state boundaries).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(process.env.TEMP || "/tmp", "india_states.geojson");
const outPath = path.resolve(
  __dirname,
  "../../frontend/src/data/indiaStatesPaths.js"
);

const g = JSON.parse(fs.readFileSync(input, "utf8"));

const LON_MIN = 68;
const LON_MAX = 97.5;
const LAT_MIN = 6.5;
const LAT_MAX = 37.5;
const W = 560;
const H = 640;
const PAD = 8;

const project = (lon, lat) => {
  const x = PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - PAD * 2);
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2);
  return [Math.round(x), Math.round(y)];
};

const simplifyRing = (ring, step) => {
  if (!ring || ring.length < 4) return ring;
  const out = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  const first = ring[0];
  const last = out[out.length - 1];
  if (last[0] !== first[0] || last[1] !== first[1]) out.push(first);
  return out.length >= 4 ? out : ring;
};

const ringToPath = (ring) => {
  if (!ring?.length) return "";
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]} ${pts[i][1]}`;
  return `${d}Z`;
};

const NAME_MAP = {
  "Andaman and Nicobar": "Andaman and Nicobar Islands",
  "NCT of Delhi": "Delhi",
  Orissa: "Odisha",
  Uttaranchal: "Uttarakhand",
};

const states = [];
for (const f of g.features) {
  const raw = f.properties.NAME_1;
  const name = NAME_MAP[raw] || raw;
  const geom = f.geometry;
  let d = "";
  const step = 20;
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) d += ringToPath(simplifyRing(ring, step));
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) {
      for (const ring of poly) d += ringToPath(simplifyRing(ring, step));
    }
  }
  if (d) states.push({ id: name, name, path: d });
}

states.sort((a, b) => a.name.localeCompare(b.name));

const content = `/** Pre-projected simplified India state/UT SVG paths (viewBox 0 0 560 640). Auto-generated — do not edit by hand. */
export const INDIA_MAP_VIEWBOX = "0 0 560 640";
export const INDIA_STATE_PATHS = ${JSON.stringify(states)};
export default INDIA_STATE_PATHS;
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content);
console.log("states", states.length);
console.log("sizeKB", Math.round(Buffer.byteLength(content) / 1024));
console.log("out", outPath);
console.log("names", states.map((s) => s.name).join(", "));
