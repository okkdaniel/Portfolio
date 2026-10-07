// node plotparts.mjs <model.glb> <out.json> <name>...: samples each named
// assembly's triangles (world space, inches) for plotting, every Nth one.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import fs from "node:fs";
const [file, out, ...names] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const IN = 0.0254, groups = Object.fromEntries(names.map((n) => [n, []]));
const owner = (n) => { for (let p = n; p; p = p.getParentNode()) { const k = names.find((x) => p.getName().startsWith(x)); if (k) return k; } return null; };
let t = 0;
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  const k = owner(n); if (!k) continue;
  const W = n.getWorldMatrix();
  for (const prim of m.listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), idx = prim.getIndices(); if (!idx) continue;
    const c = idx.getCount();
    for (let i = 0; i < c; i += 3) {
      if ((t++ % 9) !== 0) continue;
      const tri = [0, 1, 2].map((j) => { const v = pos.getElement(idx.getScalar(i + j), []); return [0, 1, 2].map((r) => +((W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]) / IN).toFixed(2)); });
      groups[k].push(tri);
    }
  }
}
for (const k of names) console.log(k, groups[k].length);
fs.writeFileSync(out, JSON.stringify(groups));
