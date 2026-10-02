// The site's opening, for video: the clearing growing in over the anura frog,
// drawn with the site's own forms and ink, but on a transparent canvas with
// no paper laid down. The frog is masking fluid as on the site, so it comes
// up as a frog-shaped hole in the growth: negative space, not white.
//
// Two differences from the site, both for the video:
// - Pacing. On the site every stroke eases out, but the broad ground washes
//   all land in the first moments, so the frog snaps into view. Here the
//   marks are re-timed so the ink as a whole eases out over the same time the
//   site's clearing takes: quick at first, slowing to a stop, with the frog
//   surfacing over several frames as the ground builds up around it.
// - More around it, in one of two styles:
//   ring   big ferns reach out from the clearing's lower corners, and
//          wildflowers and lupines come up all around its edge
//   vine   a tighter clearing, with two or three vines wrapping the frog's
//          outline and opening the site's plants (and the odd flower) as
//          they go, so everything grows out of the frog. How many vines,
//          where they start and what they open all come from the seed, so
//          every seed is a different version.
// - Optical centering. The frog is placed by its visual center (the
//   alpha-weighted centroid of its pixels), and the growth is shifted so its
//   own center of ink sits on that point.
//
// Open /tools/frog-reveal/ on the dev server to watch it play. render.mjs
// drives it frame by frame (?render) and encodes the video.
//
// Query params (all optional):
//   w, h    frame size in CSS px (960 × 540)
//   dpr     pixels per CSS px (2, so 1920 × 1080 out)
//   fps     frame rate (12, the site's stop-motion beat)
//   dur     seconds the growth takes (ring: as long as the site's clearing,
//           ~4; vine: 4.1)
//   ease    how hard the growth eases out: 1 lays ink at a constant rate,
//           higher front-loads it (4, the site's ease-out quart)
//   even    0..1, how far the marks are re-timed to that curve; 0 keeps the
//           site's own timing (0.85)
//   style   "ring" or "vine" (ring)
//   flowers ring: how many flowers come up around the clearing (18)
//   trees   ring: 1 adds a fir either side of the clearing (0)
//   seed    which version of the growth (any text; "cedar", picked because
//           its ground outlines the whole frog)
//   frog    frog size, as a share of the frame's shorter side (0.5)

import { resistFrom } from "../../src/art/ink.js";
import { clearing, conifer, fern, wildflower, lupine, vine, seeded, setRandom } from "../../src/art/forms.js";
import { inkLayer, createGrowth } from "../../src/art/growth.js";

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
const W = num("w", 960), H = num("h", 540), DPR = num("dpr", 2);
const FPS = num("fps", 12), EASE = num("ease", 4), EVEN = num("even", 0.85);
const FROG = num("frog", 0.5), FLOWERS = num("flowers", 18), TREES = num("trees", 0);
const SEED = q.get("seed") ?? "cedar";
const STYLE = q.get("style") ?? "ring";
const LEAD = 0.17, TAIL = 1.5; // seconds of empty frame before, and held after

const canvas = document.getElementById("c");
canvas.style.width = `${W}px`;
canvas.style.height = `${H}px`;
const layer = inkLayer(canvas, 3);
layer.size(W, H, DPR);
const { ink } = layer;
const growth = createGrowth(layer);

// Ink thins out approaching the frame's edges rather than being cut by them.
const F = 1e4;
ink.feather = 60;
ink.wobble = 30;
ink.keepouts = [
  { x: -F, y: -F, w: 3 * F, h: F },
  { x: -F, y: H, w: 3 * F, h: F },
  { x: -F, y: -F, w: F, h: 3 * F },
  { x: W, y: -F, w: F, h: 3 * F },
];

// ---- the frog, by its visual center ----
const img = new Image();
img.src = "/assets/brand/anura.svg";
await img.decode();
const size = Math.min(W, H) * FROG;
const k = size / Math.max(img.width, img.height);
const fw = Math.round(img.width * k), fh = Math.round(img.height * k);
const mask = resistFrom(img, 0, 0, fw, fh);
let mass = 0, mx = 0, my = 0;
for (let y = 0; y < fh; y++) {
  for (let x = 0; x < fw; x++) {
    const a = mask.a[y * fw + x];
    mass += a; mx += a * x; my += a * y;
  }
}
const gx = mass ? mx / mass : fw / 2, gy = mass ? my / mass : fh / 2;
const cx = W / 2, cy = H / 2;
mask.x = Math.round(cx - gx);
mask.y = Math.round(cy - gy);
ink.resist = mask;

// ---- the frog's outline, for vines ----
// How far the frog reaches from its visual center in each direction (the
// farthest opaque pixel per angle, smoothed), so a vine can follow it round
// just outside.
function envelope(bins = 120) {
  const r = new Float32Array(bins);
  for (let y = 0; y < fh; y += 2) {
    for (let x = 0; x < fw; x += 2) {
      if (mask.a[y * fw + x] <= 127) continue;
      const a = Math.atan2(y - gy, x - gx);
      const b = Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * bins) % bins;
      r[b] = Math.max(r[b], Math.hypot(x - gx, y - gy));
    }
  }
  for (let b = 0; b < bins; b++) if (!r[b]) r[b] = Math.max(r[(b + bins - 1) % bins], r[(b + 1) % bins]);
  const smooth = new Float32Array(bins);
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    for (let d = -3; d <= 3; d++) sum += r[(b + d + bins) % bins];
    smooth[b] = sum / 7;
  }
  return (a) => {
    const f = (((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * bins;
    const b0 = Math.floor(f) % bins, t = f - Math.floor(f);
    return smooth[b0] * (1 - t) + smooth[(b0 + 1) % bins] * t;
  };
}

// Two or three vines wrapping the frog, each starting somewhere on its
// outline and going part of the way round, a little outside it.
function vines(random) {
  const reach = envelope();
  const out = [];
  const n = 2 + Math.floor(random() * 2);
  const flowers = 0.05 + random() * 0.2;
  const start = random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a0 = start + (i / n) * Math.PI * 2 + (random() - 0.5) * 0.8;
    const span = (0.45 + random() * 0.35) * Math.PI * 2;
    const dir = random() < 0.5 ? 1 : -1;
    const off = (8 + random() * 10) * s;
    const ph = random() * Math.PI * 2, f = 3 + random() * 4;
    const path = [];
    for (let a = 0; a <= span; a += 0.02) {
      const th = a0 + dir * a;
      // Wanders in and out a little as it goes round.
      const r = reach(th) + off * (1 + 0.6 * Math.sin(a * f + ph));
      path.push({ x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r, out: th });
    }
    out.push({ it: vine(growth.recorder, path, s, { flowers }), speed: 3 });
  }
  return out;
}

// ---- the growth ----
// The same clearing the site plants over the frog (seeded, so a render can be
// repeated exactly), around the frog's visual center.
const spread = STYLE === "vine" ? 1.1 : 1.3; // the clearing's size, against the frog's
const box = { x: cx - fw * spread / 2, y: cy - fh * spread / 2, w: fw * spread, h: fh * spread };
const s = Math.min(1.4, Math.max(0.85, Math.min(W, H) / 700));
// The flowers draw on their own random sequence, so adding or changing them
// never changes the clearing.
const random = seeded(SEED);
const flowerRandom = seeded(`${SEED}/flowers`);
let gens, flowers = [];
setRandom(random);
try {
  gens = clearing(growth.recorder, box, s, { w: W, h: H });
} finally {
  setRandom(null);
}
setRandom(flowerRandom);
try {
  const random = flowerRandom;
  if (STYLE === "vine") flowers = vines(random);
  else {
  // Flowers in a ring around the clearing's edge, where the ground is thin
  // enough for them to show, evenly spaced and leaning out a little.
  const ph = random() * Math.PI * 2;
  for (let i = 0; i < FLOWERS; i++) {
    const th = ph + ((i + (random() - 0.5) * 0.5) / FLOWERS) * Math.PI * 2;
    const rr = 0.4 + random() * 0.2;
    const fx = cx + Math.cos(th) * box.w * rr * 1.15;
    const fy = cy + Math.sin(th) * box.h * rr + box.h * 0.08;
    const fs = s * (1.6 + random() * 0.7);
    flowers.push(random() < 0.4
      ? { it: lupine(growth.recorder, fx, fy, fs), speed: 3 }
      : { it: wildflower(growth.recorder, fx, fy, -Math.PI / 2 + (random() - 0.5) * 0.7, fs), speed: 3 });
  }
  // Ferns reaching out from the clearing's lower corners, and optionally a
  // fir either side on its ground line (a conifer's height is 140–280 × its
  // scale, so scale = height / 210).
  const ground = cy + box.h * 0.5;
  const UP = -Math.PI / 2;
  if (TREES) {
    flowers.push({ it: conifer(growth.recorder, cx - box.w * 0.82, ground, (box.h * 0.8) / 210), speed: 3 });
    flowers.push({ it: conifer(growth.recorder, cx + box.w * 0.8, ground - box.h * 0.03, (box.h * 0.66) / 210), speed: 3 });
  }
  flowers.push({ it: fern(growth.recorder, cx - box.w * 0.5, ground + box.h * 0.02, UP - 1.15, s * 1.15), speed: 4 });
  flowers.push({ it: fern(growth.recorder, cx + box.w * 0.52, ground + box.h * 0.02, UP + 1.1, s * 1.1), speed: 4 });
  }
} finally {
  setRandom(null);
}
const ground = growth.timeline(gens, { random });
const marks = [...ground, ...growth.timeline(flowers, { random: flowerRandom })].sort((p, q) => p[0] - q[0]);

// How much ink a mark puts down: its area times how heavily it's laid.
const weight = ([kind, a]) => (kind === "wash" ? a[2] * a[2] * (a[4] ?? 0.4) * (a[5] ?? 1) : a[2] * a[2] * (a[4] ?? 0.85));
const total = marks.reduce((sum, m) => sum + weight(m[1]), 0) || 1;

// Shift the growth so the clearing's center of ink sits on the frog's. Ring
// flowers move with it; vines stay where they are, wrapped on the frog.
let gw = 0, ix = 0, iy = 0;
for (const [, m] of ground) {
  const w = weight(m);
  gw += w;
  ix += w * m[1][0];
  iy += w * m[1][1];
}
const dx = cx - ix / (gw || 1), dy = cy - iy / (gw || 1);
for (const [, m] of STYLE === "vine" ? ground : marks) {
  m[1][0] += dx;
  m[1][1] += dy;
}

// Re-time: lay the ink down along an ease-out curve (the share of all the
// growth's ink laid by time u is 1 - (1 - u)^EASE), blended with each mark's
// own time on the site. Both only ever increase, so the marks stay in order.
const tmax = marks.length ? marks[marks.length - 1][0] || 1 : 1;
// Vines make the growth longer on the site's timing; every vine version takes
// the same time instead, the pace of the ring version.
const DUR = num("dur", STYLE === "vine" ? 4.1 : tmax);
let laid = 0;
for (const m of marks) {
  const w = weight(m[1]);
  const share = (laid + w / 2) / total;
  laid += w;
  const eased = 1 - Math.pow(1 - share, 1 / EASE);
  m[0] = DUR * (EVEN * eased + (1 - EVEN) * (m[0] / tmax));
}
console.log(`growth: ${DUR.toFixed(2)}s (site: ${tmax.toFixed(2)}s)`);
const length = LEAD + DUR + TAIL;

// Draw everything due by frame n. Frames only go forward.
let next = 0;
const drawTo = (n) => {
  const t = n / FPS - LEAD;
  while (next < marks.length && marks[next][0] <= t) {
    const [kind, a] = marks[next][1];
    if (kind === "wash") ink.wash(...a);
    else ink.seed(...a);
    next++;
  }
  layer.flush();
};

/**
 * How well the finished growth outlines the frog, 0..1: the share of a thin
 * band just outside it that ends up inked. Draws everything first.
 */
function score() {
  drawTo(Infinity);
  const near = resistFrom(img, mask.x, mask.y, fw, fh, 12);
  const touch = resistFrom(img, mask.x, mask.y, fw, fh, 3);
  const px = layer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const inside = (m, x, y) => {
    const ix = x - m.x, iy = y - m.y;
    return ix >= 0 && iy >= 0 && ix < m.w && iy < m.h && m.a[iy * m.w + ix] > 127;
  };
  let band = 0, inked = 0;
  for (let y = near.y; y < near.y + near.h; y += 2) {
    for (let x = near.x; x < near.x + near.w; x += 2) {
      if (!inside(near, x, y) || inside(touch, x, y)) continue;
      band++;
      const i = (Math.round(y * DPR) * canvas.width + Math.round(x * DPR)) * 4 + 3;
      if (px[i] > 60) inked++;
    }
  }
  return band ? inked / band : 0;
}

window.reveal = {
  score,
  frames: Math.ceil(length * FPS),
  fps: FPS,
  width: canvas.width,
  height: canvas.height,
  /** Draw frame n and return it as a PNG data URL. */
  frame(n) {
    drawTo(n);
    return canvas.toDataURL("image/png");
  },
};

// Opened on its own, it plays in real time.
if (!q.has("render")) {
  const t0 = performance.now();
  const tick = () => {
    drawTo(Math.floor(((performance.now() - t0) / 1000) * FPS));
    if (next < marks.length) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
