// Forms: the things that grow. Each one is a generator that puts a little ink
// down and then yields, so the Field can pace it across frames and growth
// visibly creeps outward. A form can also yield { spawn } to start another
// form (runners do this: they creep along and open ferns, moss, firs on
// the way).
//
// ink.open() / ink.close() bracket one stroke: a fern leaflet, a fir bough,
// a cedar sprig, a lichen ring. Strokes nest (leaflets inside a stem), and
// the Field eases each one out on its own, so every branch visibly slows
// before it finishes rather than the plant moving at one flat speed.
//
// Nothing here is literal botany; it's the gesture of each plant drawn in
// halftone washes and crisp seeds.

import { C } from "./ink.js";

const TAU = Math.PI * 2;
const UP = -Math.PI / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

const SPORE_COLORS = [C.lichen, C.sun, C.rust, C.fern, C.glacier, C.rain, C.spring, C.cedar, C.moss, C.berry, C.salal];

const SCHEMES = {
  fern:    [[C.fern, C.spring, C.sun], [C.spring, C.fern, C.lichen], [C.fern, C.glacier, C.sun], [C.moss, C.spring, C.rust]],
  fiddle:  [[C.spring, C.lichen, C.rust], [C.fern, C.spring, C.cedar], [C.lichen, C.moss, C.rust]],
  moss:    [[C.moss, C.lichen], [C.spring, C.moss], [C.moss, C.glacier], [C.lichen, C.fern]],
  lichen:  [[C.lichen, C.stone], [C.rust, C.sun], [C.glacier, C.lichen], [C.stone, C.rain], [C.sun, C.lichen]],
  conifer: [[C.fir, C.spruce, C.glacier], [C.fir, C.rain, C.fern], [C.spruce, C.glacier, C.fir], [C.fern, C.spruce, C.rain]],
  cedar:   [[C.spring, C.moss], [C.lichen, C.fern], [C.moss, C.sun]],
  bleed:   [C.rain, C.glacier, C.lichen, C.spring, C.stone],
};

/** A smoothly wandering path, `step` px apart: [{ x, y, a, t }]. */
function wander(x, y, a, length, { step = 3, curl = 0, jitter = 0.03, droop = 0 } = {}) {
  const pts = [];
  let n = 0;
  const steps = Math.max(1, Math.round(length / step));
  for (let i = 0; i <= steps; i++) {
    pts.push({ x, y, a, t: i / steps });
    n = n * 0.9 + (Math.random() - 0.5) * jitter;
    a += curl + n;
    if (droop) a += droop * Math.sin(Math.PI / 2 - a); // steer toward straight down
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
  }
  return pts;
}

// ---- small pieces ---------------------------------------------------------

/** Confetti: spores and pollen thrown around a point. */
export function* spores(ink, x, y, R, n, colors = SPORE_COLORS) {
  ink.open();
  for (let i = 0; i < n; i++) {
    const ang = rand(0, TAU);
    const d = R * Math.sqrt(Math.random()) * rand(0.3, 1);
    const big = chance(0.12);
    ink.seed(x + Math.cos(ang) * d, y + Math.sin(ang) * d, big ? rand(3, 5.5) : rand(0.9, 2.8), pick(colors), rand(0.45, 0.95));
    if (i % 3 === 0) yield;
  }
  ink.close();
}

/** Big, faint washes: color bleeding into the paper under everything else. */
export function* bleed(ink, x, y, s, rgb = pick(SCHEMES.bleed)) {
  ink.open();
  const n = randInt(2, 4);
  for (let i = 0; i < n; i++) {
    ink.wash(x + rand(-60, 60) * s, y + rand(-50, 50) * s, rand(50, 110) * s, rgb, rand(0.18, 0.28), rand(0.45, 0.65));
    yield;
  }
  ink.close();
}

// ---- plants ---------------------------------------------------------------

export function* fern(ink, x, y, a, s, sc = pick(SCHEMES.fern)) {
  const L = rand(150, 280) * s;
  const rachis = wander(x, y, a, L, { curl: rand(-0.012, 0.012), jitter: 0.015 });

  ink.open();
  for (let i = 0; i < rachis.length; i += 9) {
    const p = rachis[i];
    ink.wash(p.x, p.y, 32 * s * (1 - p.t * 0.5), sc[1], 0.2, 0.5);
    yield;
  }
  ink.close();

  let side = 1;
  let next = 6 * s;
  for (let i = 0; i < rachis.length; i++) {
    const p = rachis[i];
    ink.wash(p.x, p.y, 1.9 * s, sc[0], 0.65, 1);
    if (i * 3 >= next) {
      next += rand(7, 10) * s;
      side = -side;
      // Widest a little below the middle, narrowing to the tip.
      const prof = Math.sin(Math.PI * Math.min(1, p.t * 1.05 + 0.1)) * (1 - 0.35 * p.t);
      const len = (12 + 46 * prof) * s;
      const pa = p.a + side * (Math.PI / 2 - 0.45 - 0.4 * p.t);
      ink.open();
      for (const q of wander(p.x, p.y, pa, len, { curl: -side * 0.015, jitter: 0.02 })) {
        ink.wash(q.x, q.y, (6.5 - 4 * q.t) * s, chance(0.12) ? sc[2] : sc[0], 0.42, 0.9);
      }
      ink.close();
    }
    if (i % 2) yield;
  }

  const tip = rachis[rachis.length - 1];
  ink.open();
  yield* fiddlehead(ink, tip.x, tip.y, tip.a, s * 0.32, sc, true);
  ink.close();
  yield* spores(ink, x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5, L * 0.6, randInt(10, 22), [sc[0], sc[1], sc[2], C.rust]);
}

export function* fiddlehead(ink, x, y, a, s, sc = pick(SCHEMES.fiddle), bare = false) {
  const dir = chance(0.5) ? 1 : -1;
  const step = 2.4 * s;
  if (!bare) {
    ink.wash(x, y, 44 * s, sc[1], 0.2, 0.5);
    for (let i = 0; i < 18; i++) {
      a += dir * 0.012;
      x += Math.cos(a) * step * 2;
      y += Math.sin(a) * step * 2;
      ink.wash(x, y, 5.5 * s, sc[0], 0.5, 0.95);
      if (i % 2) yield;
    }
  }
  // A spiral that tightens as it goes: curvature grows every step.
  let k = 0.06;
  let turned = 0;
  for (let i = 0; turned < 2.6 * Math.PI && i < 90; i++) {
    a += dir * k;
    turned += k;
    k *= 1.04;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    const u = Math.min(1, turned / (2.6 * Math.PI));
    const r = (7.5 - 5 * u) * s;
    ink.wash(x, y, r, sc[0], 0.5, 0.95);
    // Fuzzy brown scales along the outside of the curl.
    if (chance(0.35)) {
      const o = a - dir * Math.PI / 2;
      ink.seed(x + Math.cos(o) * r * 1.2, y + Math.sin(o) * r * 1.2, rand(0.6, 1.4) * Math.max(0.6, s), sc[2], 0.75);
    }
    if (i % 2) yield;
  }
  if (!bare) yield* spores(ink, x, y, 40 * s, randInt(6, 14), [sc[0], sc[1], sc[2]]);
}

export function* moss(ink, x, y, s, sc = pick(SCHEMES.moss)) {
  const R = rand(50, 100) * s;
  const ph = rand(0, TAU);
  const lobes = randInt(3, 6);
  const edge = (th) => R * (1 + 0.18 * Math.sin(lobes * th + ph) + 0.07 * Math.sin(11 * th));

  const cushion = [];
  const n = Math.round((R * R) / 45);
  while (cushion.length < n) {
    const th = rand(0, TAU);
    const d = Math.sqrt(Math.random()) * edge(th);
    cushion.push({ x: x + Math.cos(th) * d, y: y + Math.sin(th) * d * 0.72, d });
  }
  cushion.sort((p, q) => p.d - q.d);
  for (let i = 0; i < cushion.length; i++) {
    const p = cushion[i];
    ink.wash(p.x, p.y, rand(7, 13) * s, chance(0.7) ? sc[0] : sc[1], 0.38, 0.85);
    if (i % 2) yield;
  }

  // Sporophytes: thin stalks, each holding up a capsule.
  const count = randInt(6, 16);
  for (let i = 0; i < count; i++) {
    const b = pick(cushion);
    const stalk = wander(b.x, b.y, UP + rand(-0.5, 0.5), rand(10, 28) * s, { step: 2, curl: rand(-0.02, 0.02) });
    ink.open();
    for (const q of stalk) ink.seed(q.x, q.y, 0.55 * Math.max(0.7, s), C.bark, 0.6);
    const top = stalk[stalk.length - 1];
    ink.seed(top.x, top.y, rand(1.8, 3) * Math.max(0.7, s), pick([C.rust, C.cedar, C.sun, C.berry]), 0.9);
    ink.close();
    yield;
  }
}

export function* lichen(ink, x, y, s, sc = pick(SCHEMES.lichen)) {
  const R = rand(40, 90) * s;
  const ph = rand(0, TAU);
  const lobes = randInt(5, 9);
  const edge = (th) => R * (1 + 0.13 * Math.sin(lobes * th + ph) + 0.05 * Math.sin(13 * th + ph));

  ink.wash(x, y, R * 0.55, sc[1], 0.26, 0.6);
  yield;

  // Rings from the inside out; within a ring the marks land in random order,
  // so each ring stipples in rather than being drawn around.
  for (const [k, rr, col] of [[0.55, 5, sc[1]], [1, 9, sc[0]]]) {
    const marks = [];
    const circ = TAU * R * k;
    const n = Math.round(circ / 3.5);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const d = edge(th) * k + rand(-1.5, 1.5) * s;
      marks.push({ x: x + Math.cos(th) * d, y: y + Math.sin(th) * d });
    }
    marks.sort(() => Math.random() - 0.5);
    ink.open();
    for (let i = 0; i < marks.length; i++) {
      ink.wash(marks[i].x, marks[i].y, rr * s, col, 0.42, 0.9);
      if (i % 3 === 0) yield;
    }
    ink.close();
  }
  yield* spores(ink, x, y, R * 1.3, randInt(8, 18), [sc[0], sc[1], C.rust, C.sun]);
}

export function* conifer(ink, x, y, s, sc = pick(SCHEMES.conifer)) {
  const H = rand(140, 280) * s;
  const maxW = H * rand(0.3, 0.42);

  ink.open();
  for (let t = 0; t < 1; t += 0.22) {
    ink.wash(x + rand(-6, 6) * s, y - H * (t + 0.1), maxW * (1 - t) * 0.9 + 14 * s, sc[1], 0.18, 0.45);
    yield;
  }
  ink.close();

  // The trunk climbs; boughs open as it passes, long at the base, short up top.
  let nextTier = rand(10, 18) * s;
  for (let h = 0; h <= H; h += 3) {
    const t = h / H;
    const tx = x + Math.sin(h * 0.03) * 1.2 * s;
    const ty = y - h;
    ink.wash(tx, ty, 1.7 * s, C.bark, 0.55, 1);
    if (h >= nextTier) {
      nextTier += rand(6, 9) * s;
      for (const side of [-1, 1]) {
        const w = maxW * Math.pow(1 - t, 1.1) * rand(0.75, 1.1) + 3 * s;
        const a0 = side > 0 ? rand(0.12, 0.45) : Math.PI - rand(0.12, 0.45);
        // Tips turn back up a little, like fir boughs.
        ink.open();
        for (const q of wander(tx, ty, a0, w, { curl: -side * 0.012, jitter: 0.03 })) {
          ink.wash(q.x, q.y, (5 - 2.8 * q.t) * s, chance(0.85) ? sc[0] : sc[2], 0.42, 0.9);
        }
        ink.close();
      }
      yield;
    }
  }
  for (let i = 0; i < 4; i++) {
    ink.wash(x, y - H - i * 3 * s, (2.6 - i * 0.5) * s, sc[0], 0.5, 1);
  }
  yield;
  // Fallen needles and cones around the base.
  yield* spores(ink, x, y + 4 * s, maxW * 0.8, randInt(8, 16), [C.bark, C.cedar, C.rust, sc[0]]);
}

export function* cedar(ink, x, y, a, s, sc = pick(SCHEMES.cedar)) {
  // A bough that rises, arcs over and droops; flat sprays off both sides.
  function* spray(x0, y0, a0, len, depth) {
    const pts = wander(x0, y0, a0, len, { droop: 0.02 + depth * 0.01, jitter: 0.02 });
    let side = 1;
    ink.open();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      ink.seed(p.x, p.y, (depth === 0 ? 1.1 : 0.7) * Math.max(0.7, s), C.cedar, 0.55);
      ink.wash(p.x, p.y, (4.8 - depth * 1.2) * s * (1 - 0.4 * p.t), chance(0.75) ? sc[0] : sc[1], 0.4, 0.88);
      if (depth < 2 && i % 4 === 2 && p.t < 0.9) {
        side = -side;
        yield* spray(p.x, p.y, p.a + side * rand(0.7, 1.0), len * 0.42 * (1 - p.t * 0.7), depth + 1);
      }
      if (i % 2) yield;
    }
    ink.close();
  }
  ink.wash(x, y, 60 * s, sc[1], 0.18, 0.45);
  yield* spray(x, y, a, rand(110, 190) * s, 0);
  yield* spores(ink, x, y, 70 * s, randInt(6, 12), [C.cedar, C.sun, sc[0]]);
}

// ---- wiring ---------------------------------------------------------------

/** Some plant, chosen at random, rooted at (x, y). */
export function anyForm(ink, x, y, along, s) {
  const r = Math.random();
  if (r < 0.22) return { it: conifer(ink, x, y, s), speed: 3 };
  if (r < 0.42) return { it: fern(ink, x, y, UP + rand(-1.1, 1.1) + (along - UP) * 0.2, s), speed: 4 };
  if (r < 0.6)  return { it: moss(ink, x, y, s), speed: 4 };
  if (r < 0.75) return { it: lichen(ink, x, y, s), speed: 5 };
  if (r < 0.88) return { it: cedar(ink, x, y, UP + rand(0.5, 1.1) * (chance(0.5) ? 1 : -1), s), speed: 4 };
  return { it: fiddlehead(ink, x, y, UP + rand(-0.4, 0.4), s * rand(0.8, 1.3)), speed: 3 };
}

/** A creeping root/rhizome. Opens plants as it goes; sometimes forks. */
export function* runner(ink, x, y, a, s, bounds, depth = 0) {
  const len = rand(90, 240) * s;
  const col = pick([C.bark, C.moss, C.fern, C.cedar]);
  let nextBloom = rand(40, 80) * s;
  const pts = wander(x, y, a, len, { jitter: 0.06 });
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x < 0 || p.y < 0 || p.x > bounds.w || p.y > bounds.h || ink.blocked(p.x, p.y)) return;
    ink.wash(p.x, p.y, 1.3 * s, col, 0.5, 1);
    if (i * 3 >= nextBloom) {
      nextBloom += rand(55, 95) * s;
      if (chance(0.6)) yield { spawn: anyForm(ink, p.x, p.y, p.a, s * rand(0.5, 0.9)) };
    }
    if (depth < 2 && chance(0.012)) {
      yield { spawn: { it: runner(ink, p.x, p.y, p.a + rand(0.5, 0.9) * (chance(0.5) ? 1 : -1), s * 0.85, bounds, depth + 1), speed: 3 } };
    }
    yield;
  }
  const end = pts[pts.length - 1];
  if (chance(0.7)) yield { spawn: anyForm(ink, end.x, end.y, end.a, s * rand(0.5, 0.85)) };
}

/** Everything a single click sets off. */
export function grow(ink, x, y, s, bounds) {
  const out = [
    { it: bleed(ink, x, y, s), speed: 1 },
    anyForm(ink, x, y, UP, s),
    { it: spores(ink, x, y, 170 * s, randInt(30, 55)), speed: 2 },
  ];
  const n = randInt(2, 4);
  const a0 = rand(0, TAU);
  for (let i = 0; i < n; i++) {
    out.push({ it: runner(ink, x, y, a0 + (i / n) * TAU + rand(-0.4, 0.4), s, bounds), speed: 3 });
  }
  return out;
}

export { SPORE_COLORS };
