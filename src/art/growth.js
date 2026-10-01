// Growth engine for the board: copper traces that grow like a forest.
//
// Traces live on a square lattice (pitch G) and only ever move in the eight
// PCB directions, so they read as routed copper, but they branch, jog and die
// like roots and conifer limbs. Pure logic, no DOM: Board.jsx steps it and
// draws what it holds.
//
// Collision: occupancy is tracked on a half-pitch grid. Each step marks the
// node it lands on and the midpoint of the segment it drew, so two diagonals
// crossing in an X share a midpoint and the second one is refused. That keeps
// traces from ever overlapping, which is most of what makes them look routed.
//
// Memory is fixed: segments and pads sit in ring buffers. When a buffer is
// full, or a segment outlives MAX_AGE, it simply stops being drawn and its
// cells count as free again. That is the board slowly regrowing.

export const G = 8; // lattice pitch, CSS px

// Index 0 = east, clockwise. N (up the screen) = 6.
const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];
const N = 6;

export const MAX_AGE = 170; // seconds a trace stays on the board

const KINDS = {
  //       cells/s  life (cells)  width  turn   branch  child    pad on death
  trunk: { speed: 20, life: null,     width: 3,   turn: 0.05, branch: 0.24, child: "limb", pad: 0.6 },
  limb:  { speed: 24, life: [4, 13],  width: 1.6, turn: 0.07, branch: 0.12, child: "twig", pad: 0.45 },
  twig:  { speed: 28, life: [2, 7],   width: 1,   turn: 0.16, branch: 0,    child: null,   pad: 0.3 },
  root:  { speed: 30, life: [8, 28],  width: 1.3, turn: 0.15, branch: 0.07, child: "twig", pad: 0.45 },
  burst: { speed: 38, life: [12, 34], width: 2,   turn: 0.08, branch: 0.10, child: "root", pad: 0.7 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const turn = (d, by) => (d + by + 8) % 8;

export class Growth {
  constructor({ segCap = 14000, padCap = 600, tipCap = 500 } = {}) {
    this.segCap = segCap;
    this.padCap = padCap;
    this.tipCap = tipCap;
    // Segments: start cell, direction, width, birth time.
    this.sx = new Int16Array(segCap);
    this.sy = new Int16Array(segCap);
    this.sd = new Uint8Array(segCap);
    this.sw = new Float32Array(segCap);
    this.sb = new Float32Array(segCap);
    this.n = 0; // total segments ever made; ring index = n % segCap
    // Pads: cell, radius, birth, glow (soldered pads glow, grown ones don't).
    this.px = new Int16Array(padCap);
    this.py = new Int16Array(padCap);
    this.pr = new Float32Array(padCap);
    this.pb = new Float32Array(padCap);
    this.pg = new Uint8Array(padCap);
    this.pn = 0;
    this.tips = [];
    this.now = 0;
    this.trunkTimer = 0;
    this.cols = 0;
    this.rows = 0;
    this.occ = new Int32Array(0);
    this.block = new Uint8Array(0); // keep-out zones (where the text sits)
  }

  // ---- geometry ----------------------------------------------------------

  resize(width, height) {
    const cols = Math.ceil(width / G) + 1;
    const rows = Math.ceil(height / G) + 1;
    const fresh = this.cols === 0;
    this.cols = cols;
    this.rows = rows;
    this.occ = new Int32Array((cols * 2) * (rows * 2));
    this.block = new Uint8Array(this.occ.length);
    // Re-mark everything still alive so a resize (or a phone's URL bar
    // sliding away) keeps the board instead of wiping it.
    this.forEachSegment((i, serial) => {
      const x = this.sx[i], y = this.sy[i], d = this.sd[i];
      this.mark(x * 2, y * 2, serial);
      this.mark(x * 2 + DX[d], y * 2 + DY[d], serial);
      this.mark((x + DX[d]) * 2, (y + DY[d]) * 2, serial);
    });
    this.tips = this.tips.filter((t) => t.cx < cols && t.cy < rows);
    if (fresh) this.seedTrunks();
  }

  cellAt(x, y) {
    return [
      Math.max(0, Math.min(this.cols - 1, Math.round(x / G))),
      Math.max(0, Math.min(this.rows - 1, Math.round(y / G))),
    ];
  }

  // ---- occupancy (half-pitch grid; stores segment serial + 1) -------------

  /**
   * Keep-out zones, like on a real board: traces route around these rects
   * (CSS px) and never grow inside them. Replaces any previous set.
   */
  setKeepouts(rects) {
    this.block.fill(0);
    const W = this.cols * 2, H = this.rows * 2, h = G / 2;
    for (const r of rects) {
      const x0 = Math.max(0, Math.floor(r.x / h)), x1 = Math.min(W - 1, Math.ceil((r.x + r.w) / h));
      const y0 = Math.max(0, Math.floor(r.y / h)), y1 = Math.min(H - 1, Math.ceil((r.y + r.h) / h));
      for (let y = y0; y <= y1; y++) this.block.fill(1, y * W + x0, y * W + x1 + 1);
    }
  }

  mark(hx, hy, serial) {
    if (hx < 0 || hy < 0 || hx >= this.cols * 2 || hy >= this.rows * 2) return;
    this.occ[hy * this.cols * 2 + hx] = serial + 1;
  }

  taken(hx, hy) {
    if (hx < 0 || hy < 0 || hx >= this.cols * 2 || hy >= this.rows * 2) return true;
    if (this.block[hy * this.cols * 2 + hx]) return true;
    const s = this.occ[hy * this.cols * 2 + hx] - 1;
    return s >= 0 && this.segAlive(s);
  }

  segAlive(serial) {
    if (serial >= this.n) return true; // marked by a tip that hasn't drawn yet
    if (this.n - serial > this.segCap) return false;
    return this.now - this.sb[serial % this.segCap] < MAX_AGE;
  }

  /** Calls fn(ringIndex, serial) for every segment still on the board. */
  forEachSegment(fn) {
    const start = Math.max(0, this.n - this.segCap);
    for (let s = start; s < this.n; s++) {
      const i = s % this.segCap;
      if (this.now - this.sb[i] < MAX_AGE) fn(i, s);
    }
  }

  // ---- spawning ----------------------------------------------------------

  spawn(kind, cx, cy, d, extra = {}) {
    if (this.tips.length >= this.tipCap) return;
    const k = KINDS[kind];
    const life = extra.life ?? randInt(k.life[0], k.life[1]);
    this.mark(cx * 2, cy * 2, this.n);
    this.tips.push({ kind, cx, cy, d, life, life0: life, gen: extra.gen ?? 0, acc: 0, side: Math.random() < 0.5 ? 1 : -1, w: extra.w ?? k.width });
  }

  addPad(cx, cy, r, glow) {
    const i = this.pn % this.padCap;
    this.px[i] = cx; this.py[i] = cy; this.pr[i] = r; this.pb[i] = this.now; this.pg[i] = glow ? 1 : 0;
    this.pn++;
    this.mark(cx * 2, cy * 2, this.n);
  }

  seedTrunks() {
    const count = Math.max(3, Math.round(this.cols / 22));
    for (let i = 0; i < count; i++) this.spawnTrunk((i + rand(0.2, 0.8)) / count);
  }

  spawnTrunk(frac = Math.random()) {
    const cx = Math.round(frac * (this.cols - 1));
    const life = Math.round(this.rows * rand(0.35, 0.9));
    this.spawn("trunk", cx, this.rows - 1, N, { life, w: rand(2.4, 3.4) });
  }

  /** Cursor trail: one wandering root from the pointer. */
  growAt(x, y) {
    const [cx, cy] = this.cellAt(x, y);
    this.spawn("root", cx, cy, randInt(0, 7));
  }

  /** Click: a glowing solder pad that bursts into traces in every direction. */
  solderAt(x, y) {
    const [cx, cy] = this.cellAt(x, y);
    this.addPad(cx, cy, 4.5, true);
    const dirs = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5).slice(0, randInt(5, 8));
    for (const d of dirs) this.spawn("burst", cx, cy, d);
  }

  /** A small disturbance, e.g. where the frog lands. */
  ping(x, y) {
    const [cx, cy] = this.cellAt(x, y);
    for (let i = 0; i < 3; i++) this.spawn("twig", cx, cy, randInt(0, 7), { life: randInt(3, 9) });
  }

  reset() {
    this.n = 0;
    this.pn = 0;
    this.tips = [];
    this.occ.fill(0);
    this.trunkTimer = 0;
    this.seedTrunks();
  }

  // ---- simulation --------------------------------------------------------

  update(dt) {
    this.now += dt;

    // Keep the forest alive on its own: a new trunk every few seconds.
    this.trunkTimer -= dt;
    if (this.trunkTimer <= 0) {
      this.trunkTimer = rand(2.5, 5.5);
      if (this.tips.filter((t) => t.kind === "trunk").length < 4) this.spawnTrunk();
    }

    const next = [];
    for (const t of this.tips) {
      t.acc += dt * KINDS[t.kind].speed;
      let alive = true;
      while (t.acc >= 1 && alive) {
        t.acc -= 1;
        alive = this.stepTip(t, next);
      }
      if (alive) next.push(t);
    }
    this.tips = next;
  }

  stepTip(t, out) {
    const k = KINDS[t.kind];

    if (t.kind === "trunk" && t.d !== N) {
      if (Math.random() < 0.4) t.d = N; // trunks jog sideways, then straighten
    } else if (Math.random() < k.turn) {
      t.d = turn(t.d, Math.random() < 0.5 ? 1 : -1);
    }

    if (!this.tryMove(t)) {
      // Blocked: one attempt to route around, then give up.
      t.d = turn(t.d, Math.random() < 0.5 ? 1 : -1);
      if (Math.random() > 0.6 || !this.tryMove(t)) return this.die(t);
    }

    if (--t.life <= 0) return this.die(t);

    if (k.child && t.gen < 4 && Math.random() < k.branch && this.tips.length + out.length < this.tipCap) {
      // Trunks throw limbs out and down, alternating sides like a fir: mostly
      // drooping diagonals, some level, the odd one reaching up.
      let d;
      if (t.kind === "trunk") {
        t.side = -t.side;
        const r = Math.random();
        const right = t.side > 0;
        d = r < 0.5 ? (right ? 1 : 3) : r < 0.85 ? (right ? 0 : 4) : (right ? 7 : 5);
      } else {
        d = turn(t.d, (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.7 ? 1 : 2));
      }
      const ck = KINDS[k.child];
      // Limbs are long near the base of a trunk and short near its top.
      const taper = t.kind === "trunk" ? 0.35 + 1.3 * (t.life / t.life0) : 1;
      const life = Math.max(2, Math.round(randInt(ck.life[0], ck.life[1]) * taper));
      out.push({ kind: k.child, cx: t.cx, cy: t.cy, d, life, life0: life, gen: t.gen + 1, acc: 0, side: 1, w: ck.width });
    }
    return true;
  }

  tryMove(t) {
    const nx = t.cx + DX[t.d];
    const ny = t.cy + DY[t.d];
    if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) return false;
    const mx = t.cx * 2 + DX[t.d];
    const my = t.cy * 2 + DY[t.d];
    if (this.taken(nx * 2, ny * 2) || this.taken(mx, my)) return false;

    const serial = this.n;
    const i = serial % this.segCap;
    this.sx[i] = t.cx; this.sy[i] = t.cy; this.sd[i] = t.d;
    // Trunks thin toward their tops.
    this.sw[i] = t.kind === "trunk" ? t.w * (0.55 + 0.45 * (t.life / t.life0)) : t.w;
    this.sb[i] = this.now;
    this.n++;
    this.mark(mx, my, serial);
    this.mark(nx * 2, ny * 2, serial);
    t.cx = nx;
    t.cy = ny;
    return true;
  }

  die(t) {
    if (Math.random() < KINDS[t.kind].pad) this.addPad(t.cx, t.cy, t.w > 2 ? 3.2 : 2.4, false);
    return false;
  }

  // ---- queries -----------------------------------------------------------

  /**
   * A recent pad for the frog to land on, preferring one within `reach` px of
   * (x, y) and outside the `avoid` rect ({x, y, w, h}). Returns px or null.
   */
  randomPad(x, y, reach, avoid) {
    const picks = [];
    const start = Math.max(0, this.pn - this.padCap);
    for (let s = start; s < this.pn; s++) {
      const i = s % this.padCap;
      if (this.now - this.pb[i] > MAX_AGE * 0.8) continue;
      const pxv = this.px[i] * G, pyv = this.py[i] * G;
      if (pyv < 60 || pyv > (this.rows - 4) * G || pxv < 30 || pxv > (this.cols - 4) * G) continue;
      if (avoid && pxv > avoid.x && pxv < avoid.x + avoid.w && pyv > avoid.y && pyv < avoid.y + avoid.h) continue;
      const dist = Math.hypot(pxv - x, pyv - y);
      if (dist < 40) continue;
      picks.push({ x: pxv, y: pyv, near: dist <= reach });
    }
    const near = picks.filter((p) => p.near);
    const pool = near.length ? near : picks;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
}

export { DX, DY };
