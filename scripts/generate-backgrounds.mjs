import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "backgrounds");
const W = 1200;
const H = 675;

function rng(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MESH = {
  "aurora-bay": ["#0b1d3a", "#134e4a", "#2dd4bf", "#38bdf8", "#818cf8", "#34d399", "#0ea5e9"],
  "peach-haze": ["#ffd6c2", "#ffb4a2", "#ff8fab", "#ffc6ff", "#ffd166", "#fca5a5", "#fde68a"],
  "violet-dusk": ["#1e1b4b", "#4c1d95", "#a78bfa", "#f472b6", "#6366f1", "#c084fc", "#38bdf8"],
  "mint-fog": ["#d9f99d", "#99f6e4", "#5eead4", "#bae6fd", "#a7f3d0", "#fef08a", "#7dd3fc"],
  "ember-glow": ["#1c0a05", "#7c2d12", "#f97316", "#fb7185", "#fbbf24", "#ef4444", "#f59e0b"],
  "ocean-silk": ["#082f49", "#0c4a6e", "#0ea5e9", "#22d3ee", "#6366f1", "#2dd4bf", "#38bdf8"],
  "rose-quartz": ["#fce7f3", "#fbcfe8", "#f9a8d4", "#ddd6fe", "#fecdd3", "#e9d5ff", "#fda4af"],
  "citrus-pop": ["#fef9c3", "#fde047", "#fb923c", "#f472b6", "#a3e635", "#facc15", "#fdba74"],
};

export const RADIANT = {
  solar: ["#120a02", "#fbbf24", "#f97316"],
  lunar: ["#0b0f1a", "#e2e8f0", "#94a3b8"],
  "neon-burst": ["#0a0414", "#f0abfc", "#22d3ee"],
  tide: ["#03161f", "#22d3ee", "#2dd4bf"],
  ember: ["#170603", "#fb7185", "#f97316"],
  orchid: ["#13051f", "#c084fc", "#f472b6"],
  jade: ["#03150d", "#34d399", "#a3e635"],
  cobalt: ["#050b21", "#60a5fa", "#818cf8"],
  sunrise: ["#1f0a0a", "#fda4af", "#fcd34d"],
  dusk: ["#0f0a1f", "#a78bfa", "#fb923c"],
  frost: ["#06121c", "#bae6fd", "#e0f2fe"],
  coral: ["#1a0808", "#fb923c", "#f43f5e"],
};

const f = (n) => Number(n.toFixed(3));

function meshSvg(slug, [from, to, ...blobColors]) {
  const r = rng(`mesh:${slug}`);
  const blobs = blobColors.slice(0, 5).map((color, i) => ({
    color, x: f(0.08 + r() * 0.84), y: f(0.08 + r() * 0.84), r: f(0.42 + r() * 0.32),
    opacity: f(0.75 + r() * 0.2), id: `b${i}`,
  }));
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
${blobs.map((b) => `    <radialGradient id="${b.id}" cx="${b.x}" cy="${b.y}" r="${b.r}"><stop offset="0" stop-color="${b.color}" stop-opacity="${b.opacity}"/><stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`).join("\n")}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#base)"/>
${blobs.map((b) => `  <rect width="${W}" height="${H}" fill="url(#${b.id})"/>`).join("\n")}
</svg>
`;
}

function radiantSvg(slug, [bg, glow, accent]) {
  const r = rng(`radiant:${slug}`);
  const cx = f(W * (0.3 + r() * 0.4));
  const cy = f(H * (0.25 + r() * 0.5));
  const rays = 14 + Math.floor(r() * 8);
  const reach = W * 1.3;
  const offset = r() * Math.PI;
  const wedges = [];
  for (let i = 0; i < rays; i++) {
    const start = offset + (i / rays) * Math.PI * 2;
    const width = (Math.PI * 2 / rays) * (0.25 + r() * 0.3);
    const a1 = start, a2 = start + width;
    const p = (a) => `${f(Math.cos(a) * reach)} ${f(Math.sin(a) * reach)}`;
    wedges.push(`    <path d="M0 0 L${p(a1)} L${p(a2)} Z" fill="${i % 3 === 0 ? accent : glow}" fill-opacity="${f(0.05 + r() * 0.09)}"/>`);
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${f(W * 0.9)}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="rays" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    <radialGradient id="core" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${f(W * 0.6)}"><stop offset="0" stop-color="${glow}" stop-opacity="0.95"/><stop offset="0.18" stop-color="${glow}" stop-opacity="0.55"/><stop offset="0.4" stop-color="${accent}" stop-opacity="0.22"/><stop offset="0.65" stop-color="${accent}" stop-opacity="0.07"/><stop offset="0.85" stop-color="${accent}" stop-opacity="0.015"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <g mask="url(#rays)"><g transform="translate(${cx} ${cy})">
${wedges.join("\n")}
  </g></g>
  <rect width="${W}" height="${H}" fill="url(#core)"/>
</svg>
`;
}

for (const folder of ["mesh", "radiant"]) mkdirSync(join(root, folder), {recursive: true});
for (const [slug, colors] of Object.entries(MESH)) writeFileSync(join(root, "mesh", `${slug}.svg`), meshSvg(slug, colors));
for (const [slug, colors] of Object.entries(RADIANT)) writeFileSync(join(root, "radiant", `${slug}.svg`), radiantSvg(slug, colors));
console.log(`Wrote ${Object.keys(MESH).length} mesh + ${Object.keys(RADIANT).length} radiant backgrounds`);
