// node frcmeasure.mjs: FRC 987's bodies at rest (inches), and the arm's
// highest point at a given angle, from the prepared lines model.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read("../../public/assets/projects/frc-987-lines.glb");
const IN = 0.0254, pts = {};
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue; const W = n.getWorldMatrix(), out = (pts[n.getName()] = []);
  for (const p of m.listPrimitives()) { const a = p.getAttribute("POSITION"); for (let i = 0; i < a.getCount(); i++) { const v = a.getElement(i, []); out.push([0, 1, 2].map((r) => (W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]) / IN)); } }
}
for (const [k, P] of Object.entries(pts)) { let lo = 1e9, hi = -1e9; for (const p of P) { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[2]); } console.log(k.padEnd(9), "z", lo.toFixed(2), "..", hi.toFixed(2)); }
const S = [0, 0, 38.85];
const armTop = (rotDeg) => { const a = (rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); let hi = -1e9; for (const p of pts.arm) { const y = p[1] - S[1], z = p[2] - S[2]; hi = Math.max(hi, S[2] + y * s + z * c); } return hi; };
console.log("arm top, as modelled (hanging):", armTop(0).toFixed(2));
for (const [label, above] of [["68.36 above level", 68.359879], ["68.36 from vertical (21.64 above level)", 90 - 68.359879]]) {
  const top = armTop(90 + above); console.log(label.padEnd(42), "arm top at rest", top.toFixed(2), " carriage run for 87.77:", (87.771642 - top).toFixed(2));
}
