// node flatref.mjs <flat.glb> <out.json>: a flat pattern's exact bounds (in)
// and its hole centres, to check an unfold against.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import fs from "node:fs";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const node = doc.getRoot().listNodes().find((n) => n.getMesh());
const W = node.getWorldMatrix(), IN = 0.0254;
const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9], tris = [];
for (const prim of node.getMesh().listPrimitives()) {
  const pos = prim.getAttribute("POSITION"), idx = prim.getIndices();
  const P = []; for (let i = 0; i < pos.getCount(); i++) { const v = pos.getElement(i, []); const w = [0, 1, 2].map((r) => (W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]) / IN); P.push(w); for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], w[k]); max[k] = Math.max(max[k], w[k]); } }
  for (let t = 0; t < idx.getCount(); t += 3) { const tri = [0, 1, 2].map((k) => P[idx.getScalar(t + k)]); if (tri.every((p) => p[2] > max[2] - 0.01 || true)) tris.push(tri.map((p) => [+p[0].toFixed(4), +p[1].toFixed(4), +p[2].toFixed(4)])); }
}
console.log("bounds x", min[0].toFixed(3), max[0].toFixed(3), "y", min[1].toFixed(3), max[1].toFixed(3), "z", min[2].toFixed(3), max[2].toFixed(3));
console.log("size", (max[0] - min[0]).toFixed(3), "x", (max[1] - min[1]).toFixed(3), "x", (max[2] - min[2]).toFixed(3), "in");
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ min, max, tris }));
