// The low rise monitor stand, from its CAD (public/assets/projects/
// monitor-stand-lines.glb, made by tools/cad-lines/prepare.mjs --single): one
// sheet-metal part, about 5.8 × 4 × 4.2 in. A base plate on the ground, a
// wall bent up at each end of it, and a mounting tab bent in off each wall's
// sloping front edge.
//
// Hovered (in Works), or under the pointer (on its sheet, higher unfolds
// more), it unfolds: the tabs open out from the walls, then the walls down
// from the base, most of the way to flat but not all of it. Each bend undoes
// about its own axis, and the curve of the bend itself opens with it.
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
const SLACK = 0.0003;  // m: how far off a face a point can be and still be on it
const OPEN = 0.75; // how much of each bend undoes, fully unfolded (the rest stays bent)

const V = (a) => new THREE.Vector3(...a);
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/** A bend, ready to use: which way opens it, and where its curve starts and ends. */
function prepare(b) {
  const C = V(b.C), D = V(b.D).normalize(), e = V(b.e), f = V(b.f), n = V(b.n);
  // Across the bend, the curve runs from where it leaves the staying flange
  // (u0) round to where it meets the swinging one (u1), seen from the axis.
  const u0 = f.clone().addScaledVector(e, -e.dot(f)).normalize().negate();
  const u1 = e.clone().addScaledVector(f, -e.dot(f)).normalize().negate();
  const span = u0.angleTo(u1);
  // Opening it turns f toward -e (flat), about D.
  const sign = Math.sign(D.clone().cross(f).dot(e.clone().negate())) || 1;
  return { C, D, e, f, n, d: b.d, t: b.t, u0, span, sign, angle: THREE.MathUtils.degToRad(b.angle) };
}

/**
 * How much of a bend's turn a point takes: 0 in the staying flange (within
 * its sheet, past where the bend leaves it), along the curve of the bend how
 * far round it is, and 1 for everything else on that side, which swings.
 */
function share(b, p) {
  const r = p.clone().sub(b.C);
  const s = p.dot(b.n) - b.d;
  if (r.dot(b.e) >= 0 && s >= -b.t - SLACK && s <= SLACK) return 0;
  const across = r.addScaledVector(b.D, -r.dot(b.D));
  if (r.dot(b.e) < 0 && r.dot(b.f) <= 0 && across.length() <= RI + b.t + SLACK) return Math.min(1, across.angleTo(b.u0) / b.span);
  return 1;
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
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(attr, i).applyMatrix4(src.matrixWorld); rest[i * 3] = v.x; rest[i * 3 + 1] = v.y; rest[i * 3 + 2] = v.z; }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(src.geometry.index);
  const position = new THREE.BufferAttribute(rest.slice(), 3);
  geometry.setAttribute("position", position);
  const mesh = new THREE.Mesh(geometry, src.material);
  view.scene.add(mesh);

  // Which side each point is on, and how much of each of that side's two
  // bends it takes (the tab's bend only counts on the wall's side of the
  // base's bend).
  const sides = BENDS.map(([a, b]) => [prepare(a), prepare(b)]);
  const side = new Int8Array(n), w1 = new Float32Array(n), w2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    v.fromArray(rest, i * 3);
    const s = v.x >= 0 ? 0 : 1, [b1, b2] = sides[s];
    side[i] = s;
    w1[i] = share(b1, v);
    w2[i] = w1[i] === 1 ? share(b2, v) : 0;
  }

  // A point turned about a bend's axis by angle a.
  const turn = (out, b, a) => {
    const c = Math.cos(a), s = Math.sin(a), { C, D } = b;
    const x = out.x - C.x, y = out.y - C.y, z = out.z - C.z;
    const d = D.x * x + D.y * y + D.z * z;
    const cx = D.y * z - D.z * y, cy = D.z * x - D.x * z, cz = D.x * y - D.y * x;
    out.set(C.x + x * c + cx * s + D.x * d * (1 - c), C.y + y * c + cy * s + D.y * d * (1 - c), C.z + z * c + cz * s + D.z * d * (1 - c));
  };

  // u: 0 folded (as made) to 1 unfolded; the tabs go first, then the walls.
  const tabsAt = (u) => ease(u / 0.6) * OPEN, wallsAt = (u) => ease((u - 0.3) / 0.7) * OPEN;
  const pose = (u) => {
    const tabs = tabsAt(u), walls = wallsAt(u);
    const out = position.array, p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.fromArray(rest, i * 3);
      const [b1, b2] = sides[side[i]];
      if (w2[i]) turn(p, b2, b2.sign * b2.angle * tabs * w2[i]);
      if (w1[i]) turn(p, b1, b1.sign * b1.angle * walls * w1[i]);
      p.toArray(out, i * 3);
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox();
  };
  pose(0);
  view.aim(geometry.boundingBox.getCenter(new THREE.Vector3()));

  const fold = spring(0);
  const degrees = (b, k) => Math.round(b.angle * (1 - k) * (180 / Math.PI));
  // Where it's headed, as each bend's angle.
  const read = () => (fold.t <= 0.001 ? "rest" : `walls ${degrees(sides[0][0], wallsAt(fold.t))}°, tabs ${degrees(sides[0][1], tabsAt(fold.t))}°`);

  return {
    /** Camera-space boxes: folded, and round every step of unfolding. */
    boxes() {
      pose(0); const restBox = view.box(), all = restBox.clone();
      for (let k = 1; k <= 8; k++) { pose(k / 8); view.box(all); }
      pose(fold.x);
      return { rest: restBox, all };
    },
    step(dt) { const m = fold.step(dt); pose(fold.x); return m; },
    jump() { fold.jump(fold.t); },
    hover(on) { fold.t = on ? 1 : 0; },
    /** The pointer's height, bottom (0) to top (1): higher unfolds more. */
    point(_px, py) { fold.t = ease((py - 0.1) / 0.8); return read(); },
    leave() { fold.t = 0; return "rest"; },
  };
}
