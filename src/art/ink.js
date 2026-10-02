// Ink: the only way anything gets onto the paper.
//
// Two marks. A `wash` is halftone: dots on one fixed screen grid, sized and
// thinned by a soft falloff, so it reads like watercolor that went through a
// risograph. Because every wash lands on the same grid, overlapping washes
// stack on the same cells and deepen like pigment instead of turning to noise.
// A `seed` is a single crisp dot: spores, capsules, pollen.
//
// Ink lands on the paper by multiply, so color only ever darkens where it
// overlaps, the way paint behaves on paper. (Marks are drawn onto a scratch
// layer that the Field multiplies onto the paper once per frame; see
// Field.jsx for why.)

export const PAPER = "#f3f0e8";
export const PITCH = 3; // halftone screen, CSS px (finer on phones)

export const FEATHER = 70; // px over which ink thins out approaching a keep-out
export const WOBBLE = 36;  // how far that edge wanders, so it never reads as a line

// The wash's falloff curves, f^0.55 and f^0.7, precomputed: they run for
// every dot of every wash, and Math.pow there was a real share of the cost.
const LUT_N = 1023;
const POW_055 = new Float32Array(LUT_N + 2);
const POW_07 = new Float32Array(LUT_N + 2);
for (let i = 0; i <= LUT_N + 1; i++) {
  const f = Math.min(1, i / LUT_N);
  POW_055[i] = Math.pow(f, 0.55);
  POW_07[i] = Math.pow(f, 0.7);
}

// Pacific Northwest, a bit brighter than life.
export const C = {
  moss:     [124, 150, 40],
  lichen:   [198, 210, 58],
  spring:   [150, 202, 78],
  fern:     [52, 142, 76],
  fir:      [22, 96, 74],
  spruce:   [48, 112, 128],
  glacier:  [58, 168, 166],
  rain:     [98, 160, 214],
  cedar:    [184, 84, 50],
  rust:     [230, 128, 36],
  sun:      [244, 198, 38],
  bark:     [112, 80, 58],
  berry:    [212, 52, 66],
  salal:    [74, 64, 132],
  fireweed: [222, 84, 150],
  lupine:   [104, 92, 200],
  stone:    [150, 164, 150],
};

export class Ink {
  constructor(ctx, pitch = PITCH) {
    this.ctx = ctx;
    this.pitch = pitch;
    // Device pixels per CSS pixel on the canvas; dots snap to this grid.
    this.pixelRatio = 1;
    this.keepouts = [];
    // How softly ink gives out approaching a keep-out (see fade).
    this.feather = FEATHER;
    this.wobble = WOBBLE;
    // Masking fluid: { x, y, w, h, a } — a shape (the frog) painted onto the
    // paper before anything grows. Ink never lands inside it, so washes that
    // pass over it leave it behind as bare paper.
    this.resist = null;
    // Running count of dots drawn, so the Field can budget each frame by how
    // much it actually asked the canvas to fill.
    this.dots = 0;
    // Bounding box [x0, y0, x1, y1] (CSS px) of everything drawn since the
    // Field last flushed this layer onto the paper.
    this.dirty = null;
  }

  resisted(x, y) {
    const m = this.resist;
    if (!m) return false;
    const ix = Math.floor(x - m.x), iy = Math.floor(y - m.y);
    return ix >= 0 && iy >= 0 && ix < m.w && iy < m.h && m.a[iy * m.w + ix] > 127;
  }

  /**
   * How much ink may land at (x, y), 0..1. Nothing lands on the resist.
   * Keep-outs aren't hard walls: approaching one, ink thins out over FEATHER
   * px along an uneven edge (a fixed wobble, so the edge is the same for every
   * plant), the way paint gives out at the edge of a dry patch. Inside one,
   * nothing lands.
   */
  fade(x, y) {
    if (this.resisted(x, y)) return 0;
    return this.keepoutFade(x, y);
  }

  keepoutFade(x, y) {
    const F = this.feather, W = this.wobble;
    let k = 1;
    for (const r of this.keepouts) {
      const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
      const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
      let d = Math.hypot(dx, dy);
      if (d === 0) return 0;
      if (d > F + W) continue;
      d += (Math.sin(x * 0.045 + Math.sin(y * 0.031) * 2) + Math.sin(y * 0.052 + x * 0.013)) * (W / 2);
      if (d <= 0) return 0;
      if (d < F) {
        const t = d / F;
        k = Math.min(k, t * t * (3 - 2 * t));
      }
    }
    return k;
  }

  // Runners stop at the text, but creep straight over the resist (it only
  // refuses ink; it isn't a wall).
  blocked(x, y) {
    return this.keepoutFade(x, y) <= 0;
  }

  // Stroke brackets (see forms.js). Only the Field's recorder uses them for
  // timing; drawn directly, a stroke is just its marks.
  open() {}
  close() {}

  /**
   * Whether a disc at (x, y, r) could be touched by a keep-out's feathered
   * edge or by the resist. Most marks are nowhere near either, and this lets
   * them skip the per-dot fade check entirely.
   */
  nearMasks(x, y, r) {
    const M = this.feather + this.wobble;
    for (const k of this.keepouts) {
      if (x + r > k.x - M && x - r < k.x + k.w + M && y + r > k.y - M && y - r < k.y + k.h + M) return true;
    }
    const m = this.resist;
    return !!m && x + r > m.x && x - r < m.x + m.w && y + r > m.y && y - r < m.y + m.h;
  }

  /**
   * Halftone wash: a soft disc of screen dots.
   *
   * A big wash can be thousands of dots, too many for one frame, so it can be
   * drawn in pieces: pass `fromRow` (a grid row, or null to start) and
   * `maxDots`, and it stops once it has drawn that many, returning the row to
   * resume from (or -1 when the wash is complete).
   */
  wash(x, y, r, rgb, alpha = 0.4, density = 1, fromRow = null, maxDots = Infinity) {
    const ctx = this.ctx;
    const P = this.pitch;
    const k = this.pixelRatio;
    const masked = this.nearMasks(x, y, r);
    this.touch(x - r, y - r, x + r, y + r);
    const gx0 = Math.ceil((x - r) / P), gx1 = Math.floor((x + r) / P);
    const gy0 = Math.ceil((y - r) / P), gy1 = Math.floor((y + r) / P);
    const r2 = r * r;
    // Every dot of the wash goes into one path and is filled in a single
    // call. The dots sit on separate grid cells and never overlap, so this
    // looks identical to filling them one by one, at a fraction of the cost.
    let dots = 0;
    let resume = -1;
    ctx.beginPath();
    for (let gy = fromRow ?? gy0; gy <= gy1; gy++) {
      if (dots >= maxDots) { resume = gy; break; }
      const py = gy * P;
      const dy = py - y;
      for (let gx = gx0; gx <= gx1; gx++) {
        const px = gx * P;
        const dx = px - x;
        const d2 = (dx * dx + dy * dy) / r2;
        if (d2 >= 1) continue;
        const f = density * (1 - d2) * (1 - d2);
        const fi = (f * LUT_N) | 0;
        // Dense in the middle, breaking up raggedly toward the edge.
        if (Math.random() > POW_055[fi]) continue;
        if (masked && Math.random() > this.fade(px, py)) continue;
        const s = (0.3 + 0.7 * POW_07[fi] * (0.75 + Math.random() * 0.25)) * P;
        // Snapped to whole device pixels: square, unsmoothed edges are the
        // canvas's fast path (benchmarked ~2.5x quicker to fill), and on a 3px
        // halftone screen the difference doesn't show.
        const e = Math.max(1, Math.round(s * k)) / k;
        ctx.rect(Math.round((px - e / 2) * k) / k, Math.round((py - e / 2) * k) / k, e, e);
        dots++;
      }
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.fill();
    this.dots += dots;
    return resume;
  }

  /** One crisp round dot. */
  touch(x0, y0, x1, y1) {
    const d = this.dirty;
    if (!d) this.dirty = [x0, y0, x1, y1];
    else {
      if (x0 < d[0]) d[0] = x0;
      if (y0 < d[1]) d[1] = y0;
      if (x1 > d[2]) d[2] = x1;
      if (y1 > d[3]) d[3] = y1;
    }
  }

  seed(x, y, r, rgb, alpha = 0.85) {
    if (this.nearMasks(x, y, r) && Math.random() > this.fade(x, y)) return;
    this.touch(x - r, y - r, x + r, y + r);
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    this.dots++;
  }
}

/**
 * Masking fluid in the shape of an image (see Ink.resist): the image drawn at
 * (x, y), w × h CSS px, and wherever it's opaque, ink won't land. `spread`
 * widens the shape by that many px all round, so ink stops a little short of
 * it and leaves a margin of bare paper. (Widened by stamping the image around
 * a ring rather than with a canvas blur filter, which Safari lacks.)
 */
export function resistFrom(img, x, y, w, h, spread = 0) {
  const pad = Math.ceil(spread);
  const mw = w + pad * 2, mh = h + pad * 2;
  const probe = document.createElement("canvas");
  probe.width = mw;
  probe.height = mh;
  const pc = probe.getContext("2d", { willReadFrequently: true });
  pc.drawImage(img, pad, pad, w, h);
  if (spread > 0) {
    for (const r of [spread / 2, spread]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pc.drawImage(img, pad + Math.cos(a) * r, pad + Math.sin(a) * r, w, h);
      }
    }
  }
  const px = pc.getImageData(0, 0, mw, mh).data;
  const a = new Uint8Array(mw * mh);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3];
  return { x: x - pad, y: y - pad, w: mw, h: mh, a };
}
