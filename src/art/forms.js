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

// Where forms get their randomness. Usually Math.random; a planting can bring
// a seeded source instead (growth.js swaps it in while that planting records),
// so it grows the same way every time.
let random = Math.random;
export const setRandom = (fn) => { random = fn || Math.random; };

/** A repeatable random source for a string key (mulberry32). */
export function seeded(key) {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = (a, b) => a + random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const chance = (p) => random() < p;

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
    n = n * 0.9 + (random() - 0.5) * jitter;
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
    const d = R * Math.sqrt(random()) * rand(0.3, 1);
    const big = chance(0.12);
    ink.seed(x + Math.cos(ang) * d, y + Math.sin(ang) * d, big ? rand(3, 5.5) : rand(0.9, 2.8), pick(colors), rand(0.45, 0.95));
    if (i % 3 === 0) yield;
  }
  ink.close();
}

const GROUND = [C.moss, C.lichen, C.spring, C.glacier, C.fern];

/**
 * Ground that grows rather than lands: from a few starting points near
 * (x, y), walkers creep outward along wandering paths, each laying medium
 * washes as it goes, shrinking as they get further out, so the ground
 * spreads like moss instead of appearing as round discs. Each walker is its
 * own stroke, so they all grow at once. Covers roughly a disc of radius R.
 */
export function* spread(ink, x, y, R, { origins = 3, walkers = 8, colors = GROUND, alpha = [0.18, 0.27] } = {}) {
  const starts = Array.from({ length: origins }, () => {
    const a = rand(0, TAU), d = rand(0, 0.3) * R;
    return [x + Math.cos(a) * d, y + Math.sin(a) * d];
  });
  for (let i = 0; i < walkers; i++) {
    let [wx, wy] = starts[i % origins];
    let a = rand(0, TAU);
    const steps = randInt(7, 11);
    const reach = R * rand(0.75, 1.05);
    const col = pick(colors);
    ink.open();
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      ink.wash(wx, wy, R * rand(0.15, 0.24) * (1 - 0.45 * t), chance(0.7) ? col : pick(colors), rand(...alpha), rand(0.6, 0.8));
      a += rand(-0.5, 0.5);
      wx += Math.cos(a) * (reach / steps);
      wy += Math.sin(a) * (reach / steps);
      if (k % 2) yield;
    }
    ink.close();
  }
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
    const d = Math.sqrt(random()) * edge(th);
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

// `opts` pins the radius, lobe count, spore count and ring ink (the seal by the name
// uses this to draw a lichen of a fixed size); the field leaves them random.
export function* lichen(ink, x, y, s, sc = pick(SCHEMES.lichen), opts = {}) {
  const R = opts.R ?? rand(40, 90) * s;
  const ph = rand(0, TAU);
  const lobes = opts.lobes ?? randInt(5, 9);
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
    marks.sort(() => random() - 0.5);
    ink.open();
    for (let i = 0; i < marks.length; i++) {
      ink.wash(marks[i].x, marks[i].y, rr * s, col, opts.ringAlpha ?? 0.42, 0.9);
      if (i % 3 === 0) yield;
    }
    ink.close();
  }
  yield* spores(ink, x, y, R * 1.3, opts.spores ?? randInt(8, 18), [sc[0], sc[1], C.rust, C.sun]);
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

// ---- flowers --------------------------------------------------------------
// Not planted on the field; the frog reveal video (tools/frog-reveal) sets
// them around its clearing.

const PETALS = [C.berry, C.sun, C.fireweed, C.lupine, C.rain, C.rust];

/** A wildflower: a thin stem, a leaf or two, then a ring of petals opening around a seeded eye. */
export function* wildflower(ink, x, y, a, s, petal = pick(PETALS)) {
  const stem = wander(x, y, a, rand(40, 95) * s, { step: 2.5, curl: rand(-0.01, 0.01), jitter: 0.04 });
  const leafAt = new Set([Math.floor(stem.length * 0.35), chance(0.5) ? Math.floor(stem.length * 0.6) : -1]);
  for (let i = 0; i < stem.length; i++) {
    const p = stem[i];
    ink.wash(p.x, p.y, 1.3 * s, C.fern, 0.55, 1);
    if (leafAt.has(i)) {
      const side = chance(0.5) ? 1 : -1;
      ink.open();
      for (const q of wander(p.x, p.y, p.a + side * rand(0.6, 1), rand(10, 18) * s, { curl: -side * 0.03 })) {
        ink.wash(q.x, q.y, (3.4 - 2 * q.t) * s, pick([C.fern, C.spring]), 0.42, 0.9);
      }
      ink.close();
    }
    if (i % 2) yield;
  }
  // Petals open once the stem is up (they hang off its last mark).
  const top = stem[stem.length - 1];
  const n = randInt(5, 8);
  const ph = rand(0, TAU);
  const R = rand(7, 11) * s;
  for (let i = 0; i < n; i++) {
    const th = ph + (i / n) * TAU;
    ink.open();
    for (let j = 1; j <= 4; j++) {
      const d = (j / 4) * R;
      ink.wash(top.x + Math.cos(th) * d, top.y + Math.sin(th) * d * 0.8, (3.6 - j * 0.45) * s, petal, 0.7, 1);
    }
    ink.close();
    yield;
  }
  ink.open();
  for (let i = 0; i < 5; i++) {
    ink.seed(top.x + rand(-2, 2) * s, top.y + rand(-2, 2) * s, rand(0.8, 1.6) * Math.max(0.7, s), pick([C.sun, C.rust]), 0.9);
  }
  ink.close();
  yield;
}

/** A lupine: a fan of leaflets at the foot, then a spike of florets opening up the stem. */
export function* lupine(ink, x, y, s, flower = pick([C.lupine, C.salal, C.fireweed])) {
  const lf = randInt(6, 8);
  for (let i = 0; i < lf; i++) {
    ink.open();
    for (const q of wander(x, y - 4 * s, UP + (i / (lf - 1) - 0.5) * 2.6, rand(12, 18) * s, { jitter: 0.02 })) {
      ink.wash(q.x, q.y, (3.2 - 1.7 * q.t) * s, pick([C.fern, C.fern, C.spring]), 0.42, 0.9);
    }
    ink.close();
  }
  yield;
  const stem = wander(x, y, UP + rand(-0.15, 0.15), rand(70, 120) * s, { step: 2.5, jitter: 0.02 });
  for (let i = 0; i < stem.length; i++) {
    const p = stem[i];
    ink.wash(p.x, p.y, 1.5 * s, C.fern, 0.55, 1);
    if (p.t > 0.4 && i % 2 === 0) {
      const u = (p.t - 0.4) / 0.6; // 0 at the spike's foot, 1 at its tip
      const off = (5 * (1 - u) + 1.5) * s;
      for (const side of [-1, 1]) {
        const o = p.a + side * Math.PI / 2;
        ink.wash(p.x + Math.cos(o) * off, p.y + Math.sin(o) * off, (3.2 - 1.8 * u) * s, chance(0.15) ? C.rain : flower, 0.7, 1);
      }
    }
    if (i % 2) yield;
  }
}

/**
 * A vine: a runner that follows a given path ([{ x, y, out }], a few px
 * apart; `out` is the direction away from whatever it's wrapping) instead of
 * wandering, opening plants along the way. Now and then (`flowers`, 0..1) it
 * opens a wildflower or lupine instead. The frog reveal wraps these around
 * the frog, so everything that grows is joined to it.
 */
export function* vine(ink, path, s, { flowers = 0.15 } = {}) {
  const col = pick([C.bark, C.moss, C.fern, C.cedar]);
  let next = rand(15, 40) * s;
  let walked = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (i) walked += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y);
    ink.wash(p.x, p.y, 1.4 * s, col, 0.55, 1);
    if (walked >= next) {
      next += rand(55, 95) * s;
      const k = s * rand(0.45, 0.7);
      if (chance(flowers)) {
        // Flowers stand up, leaning a little outward.
        const lean = Math.atan2(Math.sin(p.out - UP), Math.cos(p.out - UP));
        yield { spawn: chance(0.4)
          ? { it: lupine(ink, p.x, p.y, k * 1.6) }
          : { it: wildflower(ink, p.x, p.y, UP + lean * 0.3 + rand(-0.3, 0.3), k * 1.8) } };
      } else {
        yield { spawn: anyForm(ink, p.x, p.y, p.out, k) };
      }
    }
    if (i % 2) yield;
  }
}

// ---- wiring ---------------------------------------------------------------

/** Some plant, chosen at random, rooted at (x, y). */
export function anyForm(ink, x, y, along, s) {
  const r = random();
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

/**
 * A dense patch of growth over a box: broad washes for ground, moss and
 * lichen across it, ferns and a fir at the edges, spores over the lot. The
 * Field plants this over the frog resist when the page opens, so the frog
 * comes up as bare paper in the middle of it.
 */
export function clearing(ink, box, s, bounds) {
  const { x, y, w, h } = box;
  const at = (fx, fy) => [x + fx * w, y + fy * h];
  // The ground spreads out over the box from a few points near its middle.
  const out = [{ it: spread(ink, x + w / 2, y + h / 2, Math.max(w, h) * 0.55, { origins: 3, walkers: 10, alpha: [0.2, 0.3] }), speed: 1 }];
  for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.35], [0.45, 0.65], [0.75, 0.75], [0.2, 0.75]]) {
    out.push({ it: moss(ink, ...at(fx + rand(-0.06, 0.06), fy + rand(-0.06, 0.06)), s * rand(0.85, 1.1)), speed: 4 });
  }
  out.push({ it: lichen(ink, ...at(0.55, 0.45), s), speed: 5 });
  out.push({ it: fern(ink, ...at(0.05, 0.9), UP + 0.5, s), speed: 4 });
  out.push({ it: fern(ink, ...at(0.98, 0.85), UP - 0.6, s * 0.9), speed: 4 });
  out.push({ it: conifer(ink, ...at(0.92, 0.6), s * 0.85), speed: 3 });
  out.push({ it: spores(ink, x + w / 2, y + h / 2, Math.max(w, h) * 0.75, 60), speed: 2 });
  out.push({ it: runner(ink, ...at(0.5, 0.5), rand(0, TAU), s, bounds), speed: 3 });
  return out;
}

/**
 * A project's specimen: the object (its render, laid down as masking fluid)
 * standing in a patch of ground, with the project's own plant beside it.
 * `box` is the outline of the object itself, and the open paper to its left
 * is where the plant goes. Everything grows around the object and leaves it
 * bare, the way the clearing leaves the frog.
 */
export function specimen(ink, plant, box, s) {
  const { x, y, w, h } = box;
  const base = y + h;
  const left = x - Math.min(x * 0.42, 90 * s); // root of the plant, in the open paper
  const ground = function* () {
    ink.open();
    for (let i = 0; i < 12; i++) {
      ink.wash(x + rand(-0.3, 1) * w, base + rand(-0.14, 0.03) * h, rand(40, 80) * s, pick([C.moss, C.lichen, C.spring, C.glacier, C.fern]), rand(0.2, 0.3), rand(0.55, 0.75));
      yield;
    }
    ink.close();
  };
  const out = [{ it: ground(), speed: 1 }];
  for (const f of [-0.12, 0.3, 0.75]) {
    out.push({ it: moss(ink, x + (f + rand(-0.05, 0.05)) * w, base + rand(-0.02, 0.03) * h, s * rand(0.6, 0.8)), speed: 4 });
  }
  out.push({ it: lichen(ink, x + w * rand(0.85, 1), base - h * rand(0.05, 0.15), s * 0.7), speed: 5 });
  if (plant === "conifer") {
    out.push({ it: conifer(ink, left, base + 4 * s, (0.85 * h) / 210), speed: 3 });
  } else if (plant === "cedar") {
    const k = Math.min(1.25, (0.45 * w) / 150);
    out.push({ it: cedar(ink, left, base, UP + 0.55, k), speed: 4 });
    out.push({ it: cedar(ink, left + 30 * s, base, UP + 0.95, k * 0.7), speed: 4 });
  } else if (plant === "fern") {
    out.push({ it: fern(ink, left, base, UP - 0.45, (0.9 * h) / 215), speed: 4 });
    out.push({ it: fiddlehead(ink, x + w * 0.95, base, UP + 0.2, s * 0.9), speed: 3 });
  }
  out.push({ it: spores(ink, x + w * 0.4, base - h * 0.4, Math.max(w, h) * 0.7, 40), speed: 2 });
  return out;
}

/**
 * A patch of growth around an object's silhouette on the field (the Works
 * view), put together the way the frog's clearing is: loosely, from pieces
 * landing where they land, so it looks grown rather than drawn round the
 * object. Ground spreads from a few off-centre points; runners creep along
 * a few stretches of the outline (`edge`: points on the edge of its masking
 * fluid), unevenly and with gaps, never the whole way round; moss, lichen
 * and spores fall where they will; the project's own plant stands to one
 * side, and a couple of other plants come up nearby; sometimes a runner
 * wanders off and opens more. How much of each, and where, varies patch to
 * patch. The patch leans: it's heavier on one side, mostly low or to one
 * flank, as things grow up from the ground. `bounds` ({ w, h }) is the
 * window, for the runners.
 */
export function plot(ink, plant, box, s, edge = [], bounds = { w: 1e4, h: 1e4 }) {
  const { x, y, w, h } = box;
  const cx = x + w / 2, cy = y + h / 2;
  const at = (fx, fy) => [x + fx * w, y + fy * h];
  const R = Math.max(w, h);
  const lean = rand(-0.15, 1.15) * Math.PI; // 0 right, π/2 down, π left; never straight up
  const lx = Math.cos(lean), ly = Math.sin(lean);
  // How much a point sits on the heavy side: 0.4 at the far side, 1 at the heavy one.
  const weight = (px, py) => {
    const c = 0.5 + 0.5 * Math.cos(Math.atan2(py - cy, px - cx) - lean);
    return 0.4 + 0.6 * c * c;
  };
  // A point somewhere round the object, more likely on the heavy side.
  const around = (lo = 0.9, hi = 1.25) => {
    let a = rand(0, TAU);
    for (let k = 0; k < 4 && random() > weight(cx + Math.cos(a), cy + Math.sin(a)); k++) a = rand(0, TAU);
    const d = rand(lo, hi);
    return [cx + Math.cos(a) * (w / 2) * d, cy + Math.sin(a) * (h / 2) * d];
  };

  // The object's outline, in order round it: the outermost edge point at
  // each angle from its middle.
  const bins = 180;
  const ring = new Array(bins);
  for (const e of edge) {
    const a = Math.atan2(e.y - cy, e.x - cx);
    const b = Math.floor(((a + Math.PI) / TAU) * bins) % bins;
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (!ring[b] || d > ring[b].d) ring[b] = { x: e.x, y: e.y, d };
  }
  const outline = ring.filter(Boolean);
  const onRing = new Set(outline);

  const out = [];

  // Ground, spreading from a few points near the heavy side of the middle.
  out.push({ it: spread(ink, cx + lx * R * rand(0.05, 0.3) + rand(-0.15, 0.15) * w, cy + ly * R * rand(0.05, 0.3) + rand(-0.1, 0.15) * h, R * rand(0.55, 0.72), { origins: randInt(2, 4), walkers: randInt(8, 13), alpha: [0.18, 0.3] }), speed: 1 });

  // Runners along stretches of the outline: a few, of uneven lengths, with
  // gaps, sizes and distance from the edge all wandering.
  const along = function* (from, dir, length) {
    ink.open();
    const N = outline.length;
    let off = rand(1, 6);
    for (let k = 0; k < length; k++) {
      const p = outline[(((from + dir * k) % N) + N) % N];
      off = Math.max(0, Math.min(16, off + rand(-2, 2)));
      if (chance(0.22)) { if (k % 2) yield; continue; }
      const nx = (p.x - cx) / (p.d || 1), ny = (p.y - cy) / (p.d || 1);
      const wgt = weight(p.x, p.y);
      ink.wash(p.x + nx * off, p.y + ny * off, Math.max(4, R * rand(0.025, 0.085) * (0.6 + 0.6 * wgt)), pick([C.moss, C.fern, C.lichen, C.spring, C.glacier, C.fir]), rand(0.28, 0.46), rand(0.75, 0.95));
      if (chance(0.25)) {
        const f = R * rand(0.04, 0.2);
        ink.wash(p.x + nx * f, p.y + ny * f, R * rand(0.06, 0.14) * wgt, pick(GROUND), rand(0.18, 0.3), rand(0.6, 0.8));
      }
      if (k % 2) yield;
    }
    ink.close();
  };
  if (outline.length > 8) {
    const N = outline.length;
    const cover = rand(0.5, 0.85);
    const pieces = randInt(2, 4);
    for (let k = 0; k < pieces; k++) {
      let from = Math.floor(rand(0, N));
      for (let t = 0; t < 4 && random() > weight(outline[from].x, outline[from].y); t++) from = Math.floor(rand(0, N));
      out.push({ it: along(from, chance(0.5) ? 1 : -1, Math.round(((N * cover) / pieces) * rand(0.6, 1.4))), speed: 1 });
    }
    // The edges inside it (cut-outs), some of them.
    const inner = edge.filter((e) => !onRing.has(e));
    if (inner.length) {
      out.push({ it: (function* () {
        ink.open();
        for (let i = 0, n = Math.round(Math.min(160, inner.length / 2) * rand(0.5, 1)); i < n; i++) {
          const e = pick(inner);
          ink.wash(e.x, e.y, Math.max(5, R * rand(0.03, 0.08)), pick([C.moss, C.fern, C.lichen, C.spring, C.glacier]), rand(0.28, 0.46), rand(0.8, 0.95));
          if (i % 3 === 2) yield;
        }
        ink.close();
      })(), speed: 1 });
    }
  }

  // Moss cushions and lichen, wherever they fall round it.
  for (let k = 0, m = randInt(2, 6); k < m; k++) {
    out.push({ it: moss(ink, ...around(0.75, 1.2), s * rand(0.4, 0.85)), speed: 4 });
  }
  for (let k = 0, m = randInt(0, 2); k < m; k++) {
    out.push({ it: lichen(ink, ...around(0.8, 1.25), s * rand(0.35, 0.65)), speed: 5 });
  }

  // The project's plant, just off one flank, on or near the ground line.
  const left = lx < 0 || (Math.abs(lx) < 0.2 && chance(0.5));
  const [px, py] = at(left ? rand(-0.16, 0) : rand(1, 1.16), rand(0.82, 1.04));
  if (plant === "conifer") {
    out.push({ it: conifer(ink, px, py, (rand(0.6, 1.05) * h) / 210), speed: 3 });
  } else if (plant === "cedar") {
    out.push({ it: cedar(ink, px, py, UP + (left ? rand(0.3, 0.9) : -rand(0.3, 0.9)), Math.min(1.15, (rand(0.35, 0.65) * w) / 150)), speed: 4 });
  } else if (plant === "fern") {
    out.push({ it: fern(ink, px, py, UP + (left ? -rand(0.1, 0.7) : rand(0.1, 0.7)), (rand(0.6, 1) * h) / 215), speed: 4 });
  }
  // A couple of other plants nearby, whatever comes up.
  for (let k = 0, m = randInt(1, 3); k < m; k++) {
    const [ox, oy] = around(0.95, 1.3);
    out.push(anyForm(ink, ox, oy, Math.atan2(oy - cy, ox - cx), s * rand(0.45, 0.8)));
  }
  // Sometimes a runner wanders off and opens more.
  if (chance(0.55)) {
    const [rx, ry] = around(0.9, 1.05);
    out.push({ it: runner(ink, rx, ry, Math.atan2(ry - cy, rx - cx) + rand(-0.6, 0.6), s * rand(0.6, 0.9), bounds), speed: 3 });
  }
  out.push({ it: spores(ink, cx + lx * R * rand(0, 0.35), cy + ly * R * rand(0, 0.35), R * rand(0.55, 0.9), randInt(16, 50)), speed: 2 });
  return out;
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
