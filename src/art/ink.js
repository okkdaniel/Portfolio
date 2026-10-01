// Ink: the only way anything gets onto the paper.
//
// Two marks. A `wash` is halftone: dots on one fixed screen grid, sized and
// thinned by a soft falloff, so it reads like watercolor that went through a
// risograph. Because every wash lands on the same grid, overlapping washes
// stack on the same cells and deepen like pigment instead of turning to noise.
// A `seed` is a single crisp dot: spores, capsules, pollen.
//
// Everything is drawn with multiply, so color only ever darkens where it
// overlaps, the way paint behaves on paper.

export const PAPER = "#f3f0e8";
export const PITCH = 3; // halftone screen, CSS px (finer on phones)

export const FEATHER = 70; // px over which ink thins out approaching a keep-out
export const WOBBLE = 36;  // how far that edge wanders, so it never reads as a line

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
  stone:    [150, 164, 150],
};

export class Ink {
  constructor(ctx, pitch = PITCH) {
    this.ctx = ctx;
    this.pitch = pitch;
    this.keepouts = [];
    // Masking fluid: { x, y, w, h, a } — a shape (the frog) painted onto the
    // paper before anything grows. Ink never lands inside it, so washes that
    // pass over it leave it behind as bare paper.
    this.resist = null;
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
    let k = 1;
    for (const r of this.keepouts) {
      const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
      const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
      let d = Math.hypot(dx, dy);
      if (d === 0) return 0;
      if (d > FEATHER + WOBBLE) continue;
      d += (Math.sin(x * 0.045 + Math.sin(y * 0.031) * 2) + Math.sin(y * 0.052 + x * 0.013)) * (WOBBLE / 2);
      if (d <= 0) return 0;
      if (d < FEATHER) {
        const t = d / FEATHER;
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

  /** Halftone wash: a soft disc of screen dots. */
  wash(x, y, r, rgb, alpha = 0.4, density = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    const P = this.pitch;
    const gx0 = Math.ceil((x - r) / P), gx1 = Math.floor((x + r) / P);
    const gy0 = Math.ceil((y - r) / P), gy1 = Math.floor((y + r) / P);
    const r2 = r * r;
    for (let gy = gy0; gy <= gy1; gy++) {
      const py = gy * P;
      const dy = py - y;
      for (let gx = gx0; gx <= gx1; gx++) {
        const px = gx * P;
        const dx = px - x;
        const d2 = (dx * dx + dy * dy) / r2;
        if (d2 >= 1) continue;
        const f = density * (1 - d2) * (1 - d2);
        // Dense in the middle, breaking up raggedly toward the edge.
        if (Math.random() > Math.pow(f, 0.55)) continue;
        if ((this.keepouts.length || this.resist) && Math.random() > this.fade(px, py)) continue;
        const s = (0.3 + 0.7 * Math.pow(f, 0.7) * (0.75 + Math.random() * 0.25)) * P;
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
    }
  }

  /** One crisp round dot. */
  seed(x, y, r, rgb, alpha = 0.85) {
    if ((this.keepouts.length || this.resist) && Math.random() > this.fade(x, y)) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
