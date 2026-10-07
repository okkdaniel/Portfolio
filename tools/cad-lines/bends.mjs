// node bends.mjs <model.glb>: the monitor stand's four bends, measured from
// its CAD faces (see planes.mjs for the face numbers). For each: the axis (a
// point on it, C, and its direction, D), the directions into the two flanges
// (e stays, f swings), the staying flange's inside face (n, d: points p in
// that flange have -t <= p.n - d <= 0, t the sheet's thickness), the bend's
// angle, and its inner and outer radii, in model units (metres). The first
// line of each is what src/figures/stand.js takes.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const node = doc.getRoot().listNodes().find((n) => n.getMesh());
const W = node.getWorldMatrix();
const prims = node.getMesh().listPrimitives();
const pts = (i) => { const p = prims[i].getAttribute("POSITION"), out = []; for (let k = 0; k < p.getCount(); k++) { const v = p.getElement(k, []); out.push([0, 1, 2].map((r) => W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r])); } return out; };
const add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i]), mul = (a, s) => a.map((x) => x * s);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / len(a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mean = (P) => mul(P.reduce(add, [0, 0, 0]), 1 / P.length);
function normal(i) { const P = pts(i), idx = prims[i].getIndices(); let n = [0, 0, 0]; for (let t = 0; t < idx.getCount(); t += 3) { const [a, b, c] = [0, 1, 2].map((k) => P[idx.getScalar(t + k)]); n = add(n, cross(sub(b, a), sub(c, a))); } return unit(n); }
// A bend between flange A (faces fa) and flange B (faces fb), curved faces fc.
function bend(name, fa, fb, fc) {
  const nA = normal(fa[0]), nB = normal(fb[0]);
  const D = unit(cross(nA, nB));
  // Each flange's two faces: the inside one faces the other flange. The
  // bend's centre is one inner radius from both inside faces; the inner
  // radius is the one that best fits the curved faces (inner at Ri, outer at
  // Ri + the sheet's thickness).
  const plane = (i) => { const n = normal(i), p = mean(pts(i)); return { n, d: dot(n, p) }; };
  const inside = (faces, toward) => faces.map(plane).map((q) => (dot(q.n, toward) > 0 ? q : { n: mul(q.n, -1), d: -q.d })).sort((x, y) => y.d - x.d)[0];
  const cA = mean(fa.flatMap(pts)), cB = mean(fb.flatMap(pts));
  const pA = fa.map(plane), pB = fb.map(plane);
  const facing = (P, other) => { const q = P.map((x) => ({ ...x, s: dot(x.n, other) - x.d })); return q.sort((x, y) => y.s - x.s)[0]; };
  const iA = facing(pA, cB), iB = facing(pB, cA); // the face of each nearer the other's middle... as a plane facing it
  const orient = (q, toward) => (dot(q.n, toward) - q.d > 0 ? q : { n: mul(q.n, -1), d: -q.d });
  const A = orient(iA, cB), B = orient(iB, cA);
  const t = Math.abs(pA[0].d - pA[1].d * Math.sign(dot(pA[0].n, pA[1].n)));
  const arc = fc.flatMap(pts);
  const mD = mean(arc.map((p) => [dot(p, D), 0, 0]))[0];
  const solve3 = (r0, r1, r2, b) => { const det = dot(r0, cross(r1, r2)); return mul(add(add(mul(cross(r1, r2), b[0]), mul(cross(r2, r0), b[1])), mul(cross(r0, r1), b[2])), 1 / det); };
  const centre = (Ri) => solve3(A.n, B.n, D, [A.d + Ri, B.d + Ri, mD]);
  let best = null;
  for (let Ri = 0.0002; Ri < 0.012; Ri += 0.00002) {
    const C = centre(Ri);
    const err = arc.reduce((s, p) => { const d = sub(p, C), r = len(sub(d, mul(D, dot(d, D)))); return s + Math.min((r - Ri) ** 2, (r - Ri - t) ** 2); }, 0);
    if (!best || err < best.err) best = { err, Ri, C };
  }
  const C = best.C;
  const radii = [best.Ri, best.Ri + t];
  // Into each flange: across the bend, along the flange, toward its middle.
  const into = (n, faces) => { let e = unit(cross(D, n)); const c = mean(faces.flatMap(pts)); if (dot(sub(c, C), e) < 0) e = mul(e, -1); return e; };
  const e = into(nA, fa), f = into(nB, fb);
  const angle = 180 - (Math.acos(Math.max(-1, Math.min(1, dot(e, f)))) * 180) / Math.PI;
  const r5 = (a) => a.map((x) => +x.toFixed(5));
  console.log(`${name}: { C: ${JSON.stringify(r5(C))}, D: ${JSON.stringify(r5(D))}, e: ${JSON.stringify(r5(e))}, f: ${JSON.stringify(r5(f))}, n: ${JSON.stringify(r5(A.n))}, d: ${A.d.toFixed(5)}, t: ${t.toFixed(5)}, angle: ${(180 - (Math.acos(Math.max(-1, Math.min(1, dot(e, f)))) * 180) / Math.PI).toFixed(1)} }`); console.log(`    radii ${radii.map((r) => (r / 0.0254).toFixed(3) + "in").join(" ")} bend ${angle.toFixed(1)}deg`);
  return { C, D, e, f, angle };
}
bend("right base>wall", [109, 108], [78, 79], [21, 22]);
bend("right wall>tab ", [78, 79], [10, 2], [16, 14]);
bend("left  base>wall", [109, 108], [48, 49], [27, 28]);
bend("left  wall>tab ", [48, 49], [43, 42], [34, 32]);
