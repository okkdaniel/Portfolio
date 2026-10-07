// node anura-type.mjs <out.svg> [seed]
// "Bishop" lettered in the anura frog's hand: thick strokes that swell and
// pinch, smooth edges with a few lumps, and ends that either run out to a
// point or finish in a round blob like its toe pads. Each letter is a few hand-placed centre lines (y down,
// baseline 300, cap height 100, x-height 172); they're smoothed, then inked
// with a wandering width and a rough outline, all as one black SVG.
import fs from "node:fs";

const [out, seedArg = "anura"] = process.argv.slice(2);

// Seeded randomness and smooth 1D noise.
let h = 2166136261; for (const c of seedArg) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
const rand = () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noise = () => { const k = Array.from({ length: 64 }, rand); return (x) => { const i = Math.floor(x), f = x - i, a = k[((i % 64) + 64) % 64], b = k[(((i + 1) % 64) + 64) % 64]; const s = f * f * (3 - 2 * f); return a + (b - a) * s; }; };

// Strokes: points, and how each end finishes ("blob" a toe pad, "taper" to a
// point, "round" plain).
const S = (pts, a = "round", b = "round", w = 1) => ({ pts, ends: [a, b], w });
const LETTERS = [
  // B
  [S([[12, 98], [15, 200], [14, 302]], "taper", "round", 1.15),
   S([[10, 104], [52, 96], [88, 110], [96, 145], [72, 186], [20, 196]], "round", "round"),
   S([[22, 196], [80, 200], [112, 232], [106, 276], [66, 300], [12, 302]], "round", "round")],
  // i
  [S([[142, 176], [144, 240], [146, 302]], "round", "blob"),
   { dot: [140, 132], r: 15 }],
  // s
  [S([[246, 186], [222, 170], [190, 172], [176, 196], [196, 226], [234, 242], [250, 268], [236, 294], [204, 304], [170, 290]], "taper", "blob")],
  // h
  [S([[284, 94], [287, 200], [289, 302]], "blob", "round", 1.15),
   S([[289, 220], [310, 184], [338, 174], [356, 196], [360, 244], [362, 302]], "round", "blob")],
  // o
  [S([[430, 170], [396, 186], [386, 236], [402, 288], [436, 304], [466, 282], [474, 226], [458, 184], [430, 170], [404, 182]], "round", "round")],
  // p
  [S([[502, 174], [504, 270], [506, 372]], "round", "taper", 1.15),
   S([[504, 204], [532, 176], [566, 180], [584, 226], [574, 276], [540, 302], [506, 292]], "round", "round")],
];

// Catmull-Rom through the points, sampled every ~1.5 units.
function smooth(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const BASE = 25;   // a stroke's usual width
const SLANT = 0.2; // lean to the right, as run over rise
const WOBBLE = 4;  // how far each hand-placed point strays
const paths = [];
const circle = (x, y, r, rough = 0.12) => {
  const nz = noise(), pts = [];
  for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2, rr = r * (1 + rough * (nz(k / 5) - 0.5)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return pts;
};

for (const letter of LETTERS) {
  for (const s of letter) {
    if (s.dot) { paths.push(circle(s.dot[0] + (300 - s.dot[1]) * SLANT, s.dot[1], s.r * 1.2, 0.12)); continue; }
    // Leaned, and each point a little off where it was put, as by hand.
    const placed = s.pts.map(([x, y], i, all) => [x + (300 - y) * SLANT + (i && i < all.length - 1 ? (rand() - 0.5) * 2 * WOBBLE : 0), y + (i && i < all.length - 1 ? (rand() - 0.5) * 2 * WOBBLE : 0)]);
    const P = smooth(placed), widthNz = noise(), edgeL = noise(), edgeR = noise();
    let len = 0; const at = [0]; for (let i = 1; i < P.length; i++) { len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); at.push(len); }
    const L = [], R = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // Width: wanders along the stroke (swell and pinch), a little thinner toward plain ends.
      // Run out to a point over the last stretch, where an end tapers.
      const point = (d) => Math.min(1, 0.1 + 0.9 * Math.pow(Math.min(1, d / 34), 0.7));
      const taper = (s.ends[0] === "taper" ? point(at[i]) : 1) * (s.ends[1] === "taper" ? point(len - at[i]) : 1);
      const w = (BASE / 2) * s.w * (0.45 + 1.0 * widthNz(at[i] / 40)) * taper;
      // The edges: smooth, with a few slow lumps.
      const nx = -ty, ny = tx, eL = 1 + 0.22 * (edgeL(at[i] / 14) - 0.5), eR = 1 + 0.22 * (edgeR(at[i] / 14) - 0.5);
      L.push([P[i][0] + nx * w * eL, P[i][1] + ny * w * eL]);
      R.push([P[i][0] - nx * w * eR, P[i][1] - ny * w * eR]);
    }
    paths.push([...L, ...R.reverse()]);
    // Ends: a round cap always; a fat toe-pad blob where marked.
    s.ends.forEach((kind, j) => {
      if (kind === "taper") return;
      const p = j === 0 ? P[0] : P[P.length - 1], w = (BASE / 2) * s.w;
      paths.push(circle(p[0], p[1], kind === "blob" ? w * 1.6 : w * 0.75, kind === "blob" ? 0.12 : 0.05));
    });
    // Knots along the way, as the frog's legs thicken at the joints.
    if (rand() < 0.6) { const i = Math.floor((0.25 + rand() * 0.5) * (P.length - 1)); paths.push(circle(P[i][0], P[i][1], (BASE / 2) * s.w * (1.05 + rand() * 0.25), 0.12)); }
  }
}

// Every shape wound the same way, so where they overlap they add up.
const area = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0);
for (const p of paths) if (area(p) < 0) p.reverse();
const f = (n) => n.toFixed(1);
const d = paths.map((p) => "M" + p.map((q) => f(q[0]) + " " + f(q[1])).join("L") + "Z").join("");
// Fit the view to the ink.
const xs = paths.flat().map((q) => q[0]), ys = paths.flat().map((q) => q[1]);
const pad = 16, minX = Math.floor(Math.min(...xs)) - pad, minY = Math.floor(Math.min(...ys)) - pad;
const W = Math.ceil(Math.max(...xs)) + pad - minX, H = Math.ceil(Math.max(...ys)) + pad - minY;
fs.writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${W} ${H}" width="${W}" height="${H}"><path fill="#000000" fill-rule="nonzero" d="${d}"/></svg>\n`);
console.log("wrote", out);
