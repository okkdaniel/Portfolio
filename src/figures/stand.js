// The low rise monitor stand, from its CAD (public/assets/projects/
// monitor-stand-lines.glb, made by tools/cad-lines/prepare.mjs --single): one
// sheet-metal part, about 5.8 × 4 × 4.2 in. A base plate on the ground, a
// wall bent up at each end of it, and a mounting tab bent in off each wall's
// sloping front edge.
//
// Hovered (or pressed, on touch), it unfolds into its flat pattern: the tabs
// open first, then the walls come down, and as it nears flat it turns to lie
// face up at you. Let go, it
// folds back up. It keeps to the space it takes up folded, the flat pattern
// drawn smaller to fit and set a little lower, so it never spreads over
// anything. All the while it
// tips a little toward the pointer, to look it over.
//
// Each bend unrolls as sheet metal does: its curve straightens out along the
// sheet's neutral surface, so the flat pattern comes out its true size (as
// the CAD's own flat pattern, 12.44 × 4.74 in).
import { spring, THREE } from "./lines.js";

const URL = "/assets/projects/monitor-stand-lines.glb";
export const config = { az: -38, el: 24, sil: [0.0012, 0.0035], url: URL };

// The bends, measured from the CAD's faces by tools/cad-lines/bends.mjs, in
// the model's units (metres). C: a point on the bend's axis (its centre of
// curvature); D: the axis; e: across the bend into the flange that stays,
// f: into the flange that swings; n, d, t: the staying flange's inside face
// and thickness (its points p have -t <= p.n - d <= 0). All four are 1/16 in
// inside radius in 1/8 in sheet. angle: how far it's bent, in degrees.
const BENDS = [
  // right: base to wall, then wall to tab
  [{ C: [0.05875, 0.03256, 0.00477], D: [0.25797, 0.96615, 0], e: [-0.96615, 0.25797, 0], f: [-0.11539, 0.03081, 0.99284], n: [0, 0, 1], d: 0.00317, t: 0.00317, angle: 96.9 },
   { C: [0.04231, -0.00287, 0.06087], D: [0, -0.42262, -0.90631], e: [0.2826, 0.86936, -0.40539], f: [-1, 0, 0], n: [-0.95924, 0.25613, -0.11943], d: -0.05019, t: 0.00317, angle: 73.6 }],
  // left
  [{ C: [-0.05882, 0.03283, 0.00477], D: [0.25797, -0.96615, 0], e: [0.96615, 0.25797, 0], f: [0.11539, 0.03081, 0.99284], n: [0, 0, 1], d: 0.00317, t: 0.00317, angle: 96.9 },
   { C: [-0.04231, -0.00096, 0.06497], D: [0, 0.42262, 0.90631], e: [-0.2826, 0.86936, -0.40539], f: [1, 0, 0], n: [0.95924, 0.25613, -0.11943], d: -0.05019, t: 0.00317, angle: 73.6 }],
];
const RI = 0.0015875;  // the bends' inside radius (1/16 in)
const K = 0.5;         // where the neutral surface sits in the sheet (K-factor; 0.5 gives
                       // the CAD flat pattern to 0.001 in)
const SLACK = 0.0003;  // m: how far off a face a point can be and still be on it
const TILT = 22;       // degrees it tips toward the pointer, at most
const LOWER = 0.3;     // how far down it settles lying flat, as a share of the way
                       // from its folded middle to its folded ground
const FOLD_S = 1.4;    // seconds to unfold all the way (or fold back), at a steady pace

const V = (a) => new THREE.Vector3(...a);
// Eased, gently at both ends.
const glide = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (6 * t - 15) + 10); };
// In turn, so each reads: the tabs open, then the walls come down, and as
// it nears flat it turns to face you and settles.
const tabsAt = (u) => glide(u / 0.45), wallsAt = (u) => glide((u - 0.2) / 0.55), turnAt = (u) => glide((u - 0.45) / 0.55);

/** A bend, ready to use. */
function prepare(b) {
  const C = V(b.C), D = V(b.D).normalize(), e = V(b.e), f = V(b.f), n = V(b.n);
  // Across the bend, the curve leaves the staying flange at u0 (seen from the
  // axis) heading T, and turns through the bend's angle to meet the other.
  const u0 = f.clone().addScaledVector(e, -e.dot(f)).normalize().negate();
  const T = e.clone().negate();
  const angle = THREE.MathUtils.degToRad(b.angle);
  const Rn = RI + K * b.t; // the neutral surface's radius
  return { C, D, e, f, n, d: b.d, t: b.t, u0, T, angle, Rn, L: Rn * angle };
}

/**
 * Along a bend's neutral surface, bent to curvature kappa: the point s along
 * it from where it leaves the staying flange (relative to C, across the bend
 * only), the way on (tan) and out (nrm). Straight when kappa is 0.
 */
function frame(b, kappa, s) {
  const x = kappa * s;
  const S = kappa > 1e-9 ? Math.sin(x) / kappa : s, Cc = kappa > 1e-9 ? (1 - Math.cos(x)) / kappa : 0;
  const O = b.u0.clone().multiplyScalar(b.Rn).addScaledVector(b.T, S).addScaledVector(b.u0, -Cc);
  const tan = b.T.clone().multiplyScalar(Math.cos(x)).addScaledVector(b.u0, -Math.sin(x));
  const nrm = b.u0.clone().multiplyScalar(Math.cos(x)).addScaledVector(b.T, Math.sin(x));
  return { O, tan, nrm };
}

/**
 * Where a point sits relative to a bend, as folded: { k: 0 } in the staying
 * flange (within its sheet, past where the curve leaves it); { k: 1 } along
 * the curve, with s (how far along its neutral surface) and h (out from it);
 * { k: 2 } everything else on that side, which swings, with x and y its
 * place in the frame at the curve's end. a: along the axis.
 */
function locate(b, p) {
  const r = p.clone().sub(b.C), a = r.dot(b.D);
  const s = p.dot(b.n) - b.d;
  if (r.dot(b.e) >= 0 && s >= -b.t - SLACK && s <= SLACK) return { k: 0 };
  const across = r.clone().addScaledVector(b.D, -a);
  if (r.dot(b.e) < 0 && r.dot(b.f) <= 0 && across.length() <= RI + b.t + SLACK) {
    const phi = Math.min(b.angle, across.angleTo(b.u0));
    return { k: 1, s: b.Rn * phi, h: across.length() - b.Rn, a };
  }
  const end = frame(b, 1 / b.Rn, b.L);
  across.sub(end.O);
  return { k: 2, x: across.dot(end.tan), y: across.dot(end.nrm), a };
}

/** Moves a located point to where it is with the bend opened by `open` (0 as made, 1 flat). */
function place(out, b, at, open) {
  const kappa = (1 - open) / b.Rn;
  const f = frame(b, kappa, at.k === 1 ? at.s : b.L);
  out.copy(b.C).add(f.O).addScaledVector(b.D, at.a);
  if (at.k === 1) out.addScaledVector(f.nrm, at.h);
  else out.addScaledVector(f.tan, at.x).addScaledVector(f.nrm, at.y);
}

export async function make(view) {
  const root = await view.model(URL);
  root.updateMatrixWorld(true);
  let src = null;
  root.traverse((o) => { if (o.isMesh && !src) src = o; });

  // Its positions, unpacked (they come quantized) into plain model units,
  // as it stands folded; each pose is worked out from these.
  const attr = src.geometry.getAttribute("position"), n = attr.count;
  const rest = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(attr, i).applyMatrix4(src.matrixWorld); v.toArray(rest, i * 3); }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(src.geometry.index);
  const position = new THREE.BufferAttribute(rest.slice(), 3);
  geometry.setAttribute("position", position);
  const mesh = new THREE.Mesh(geometry, src.material);

  // Each point's place relative to its side's bends (the tab's bend only
  // counts on the wall's side of the base's bend).
  const sides = BENDS.map(([a, b]) => [prepare(a), prepare(b)]);
  const at1 = [], at2 = [], side = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    v.fromArray(rest, i * 3);
    const s = v.x >= 0 ? 0 : 1, [b1, b2] = sides[s];
    side[i] = s;
    at1[i] = locate(b1, v);
    at2[i] = at1[i].k === 2 ? locate(b2, v) : { k: 0 };
  }

  // u: 0 folded (as made) to 1 flat; the tabs open first, then the walls.
  const unfold = (u) => {
    const tabs = tabsAt(u), walls = wallsAt(u);
    const out = position.array, p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.fromArray(rest, i * 3);
      const [b1, b2] = sides[side[i]], w = at1[i];
      if (at2[i].k) place(p, b2, at2[i], tabs);
      if (w.k === 1) place(p, b1, w, walls);
      else if (w.k === 2) {
        // The tab's bend may have moved it within the wall's frame: find
        // its place in that frame again, then carry the frame.
        const end = frame(b1, 1 / b1.Rn, b1.L), r = p.clone().sub(b1.C);
        const a = r.dot(b1.D); r.addScaledVector(b1.D, -a).sub(end.O);
        place(p, b1, { k: 2, x: r.dot(end.tan), y: r.dot(end.nrm), a }, walls);
      }
      p.toArray(out, i * 3);
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox();
  };

  // Lying flat it turns to face the camera square on, the base's front edge
  // toward you. It turns about the middle of its shape as it is; it's drawn
  // no bigger than it is folded (the flat pattern, twice as wide, smaller to
  // fit); and lying flat it sits a little lower than its middle folded,
  // easing down as it unfolds.
  const az = THREE.MathUtils.degToRad(config.az), el = THREE.MathUtils.degToRad(config.el);
  const camZ = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
  const camX = new THREE.Vector3(0, 0, 1).cross(camZ).normalize(), camY = camZ.clone().cross(camX);
  const faceUp = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(camX, camY, camZ));
  const inner = new THREE.Group(); inner.add(mesh);
  const middle = new THREE.Group(); middle.add(inner);
  const group = new THREE.Group(); group.add(middle);
  view.scene.add(group);
  unfold(0);
  const anchor = geometry.boundingBox.getCenter(new THREE.Vector3());
  group.position.copy(anchor);
  view.aim(anchor); // before measuring anything on screen
  const none = new THREE.Quaternion(), tipX = new THREE.Quaternion(), tipY = new THREE.Quaternion();
  // Where it is and how big, worked out once along the way rather than
  // measured each frame (which made it slide and swell as the walls swung):
  // it turns about a point eased from its middle folded to its middle flat,
  // and its size eases down from as made to the flat pattern's, smaller to
  // fit. The size never grows back once it has shrunk, so it settles as one.
  unfold(0); const mid0 = geometry.boundingBox.getCenter(new THREE.Vector3());
  unfold(1); const mid1 = geometry.boundingBox.getCenter(new THREE.Vector3());
  const arrange = (u) => {
    unfold(u);
    inner.position.copy(mid0).lerp(mid1, turnAt(u)).negate();
    middle.quaternion.slerpQuaternions(none, faceUp, turnAt(u));
    group.quaternion.identity(); group.scale.setScalar(1); group.position.copy(anchor);
  };
  arrange(0);
  const restBox = view.box(), RW = restBox.max.x - restBox.min.x, RH = restBox.max.y - restBox.min.y;
  const N = 32, fit = [];
  for (let i = 0; i <= N; i++) { arrange(i / N); const bx = view.box(); fit.push(Math.min(1, RW / (bx.max.x - bx.min.x), RH / (bx.max.y - bx.min.y))); }
  for (let i = 1; i <= N; i++) fit[i] = Math.min(fit[i], fit[i - 1]);
  for (let pass = 0; pass < 4; pass++) for (let i = 1; i < N; i++) fit[i] = (fit[i - 1] + 2 * fit[i] + fit[i + 1]) / 4;
  const scaleAt = (u) => { const x = Math.min(N, Math.max(0, u * N)), i = Math.min(N - 1, Math.floor(x)); return fit[i] + (fit[i + 1] - fit[i]) * (x - i); };
  let drop = 0;
  const pose = (u, tx = 0, ty = 0) => {
    arrange(u);
    group.scale.setScalar(scaleAt(u));
    // Down (along the screen's up), the same way every time, by how flat it is.
    group.position.addScaledVector(camY, -drop * turnAt(u));
    // Tipped toward the pointer, about the screen's own axes.
    tipX.setFromAxisAngle(camX, THREE.MathUtils.degToRad(-ty * TILT));
    tipY.setFromAxisAngle(camY, THREE.MathUtils.degToRad(tx * TILT));
    group.quaternion.copy(tipY).multiply(tipX);
  };

  // How far down it settles: a share of the way from its middle to its
  // ground, folded, less the flat pattern's own half height (drawn).
  pose(1);
  { const bx = view.box(), half = (bx.max.y - bx.min.y) / 2;
    drop = Math.max(0, LOWER * (RH / 2 - half)); }
  unfold(1);
  const IN = 0.0254, flat = geometry.boundingBox;
  const size = `${((flat.max.x - flat.min.x) / IN).toFixed(2)} × ${((flat.max.y - flat.min.y) / IN).toFixed(2)} in`;
  pose(0);
  // The fold goes at a steady pace, not on a spring (which rushes the
  // middle, where the walls come down); each step eases on its own.
  const fold = {
    x: 0, t: 0,
    step(dt) { const d = this.t - this.x; if (Math.abs(d) < 1e-4) { this.x = this.t; return false; } this.x += Math.sign(d) * Math.min(Math.abs(d), dt / FOLD_S); return true; },
    jump(v) { this.x = this.t = v; },
  };
  const tx = spring(0), ty = spring(0);
  const read = () => (fold.t >= 0.5 ? `flat pattern, ${size}` : "rest");

  return {
    /** Camera-space boxes: folded, and round every step of unfolding, tipped every way. */
    boxes() {
      pose(0); const rest = view.box(), all = rest.clone();
      for (let k = 0; k <= 8; k++) for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { pose(k / 8, x, y); view.box(all); }
      pose(fold.x, tx.x, ty.x);
      return { rest, all };
    },
    step(dt) {
      const m = [fold.step(dt), tx.step(dt), ty.step(dt)].some(Boolean);
      pose(fold.x, tx.x, ty.x);
      return m;
    },
    jump() { fold.jump(fold.t); tx.jump(tx.t); ty.jump(ty.t); },
    hover(on) { fold.t = on ? 1 : 0; tx.t = ty.t = 0; },
    /** The pointer on it, 0..1 across and up: it unfolds, and tips toward it. */
    point(px, py) {
      fold.t = 1;
      tx.t = Math.max(-1, Math.min(1, (px - 0.5) * 2));
      ty.t = Math.max(-1, Math.min(1, (py - 0.5) * 2));
      return read();
    },
    leave() { fold.t = 0; tx.t = ty.t = 0; return "rest"; },
  };
}
