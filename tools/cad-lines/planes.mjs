// node planes.mjs <model.glb> [n]: the big flat faces of a single-mesh part
// (each primitive one CAD face), grouped by plane, with areas and bounds (in).
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const IN = 0.0254;
const node = doc.getRoot().listNodes().find((n) => n.getMesh());
const W = node.getWorldMatrix();
const groups = new Map();
const faces = [];
node.getMesh().listPrimitives().forEach((prim, pi) => {
  const pos = prim.getAttribute("POSITION"), idx = prim.getIndices();
  const P = [];
  for (let i = 0; i < pos.getCount(); i++) { const v = pos.getElement(i, []); P.push([0, 1, 2].map((r) => (W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]) / IN)); }
  const face = { pi, area: 0, n: [0, 0, 0], min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], flat: true, N0: null };
  const count = idx ? idx.getCount() : pos.getCount();
  for (let t = 0; t < count; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => P[idx ? idx.getScalar(t + k) : t + k]);
    const u = a.map((x, k) => b[k] - x), v = a.map((x, k) => c[k] - x);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const L = Math.hypot(...n); if (!(L > 1e-12)) continue;
    const N = n.map((x) => x / L);
    if (face.N0 && N[0] * face.N0[0] + N[1] * face.N0[1] + N[2] * face.N0[2] < 0.999) face.flat = false;
    face.N0 ||= N;
    face.area += L / 2; for (let k = 0; k < 3; k++) face.n[k] += n[k] / 2;
    for (const p of [a, b, c]) for (let k = 0; k < 3; k++) { face.min[k] = Math.min(face.min[k], p[k]); face.max[k] = Math.max(face.max[k], p[k]); }
  }
  const L = Math.hypot(...face.n); face.N = face.n.map((x) => x / (L || 1));
  faces.push(face);
});
const f = (x) => x.toFixed(2);
console.log("faces", faces.length, "flat", faces.filter((x) => x.flat).length, "area", faces.reduce((s, x) => s + x.area, 0).toFixed(1));
const show = (x) => `#${x.pi} ${x.flat ? "flat" : "CURVED"} area ${x.area.toFixed(2)} n (${x.N.map(f).join(", ")}) x ${f(x.min[0])}..${f(x.max[0])} y ${f(x.min[1])}..${f(x.max[1])} z ${f(x.min[2])}..${f(x.max[2])}`;
console.log("--- biggest flat faces"); faces.filter((x) => x.flat).sort((a, b) => b.area - a.area).slice(0, +(process.argv[3] || 12)).forEach((x) => console.log(show(x)));
console.log("--- biggest curved faces (bends?)"); faces.filter((x) => !x.flat).sort((a, b) => b.area - a.area).slice(0, 12).forEach((x) => console.log(show(x)));
