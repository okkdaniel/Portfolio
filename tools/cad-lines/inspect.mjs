// node inspect.mjs <model.glb> [depth]
// Prints the assembly tree with triangle counts and world bounds (inches),
// and which parts look like hardware.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [file, depthArg = "3"] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const root = doc.getRoot();
console.log("extensions:", root.listExtensionsUsed().map((e) => e.extensionName).join(", ") || "none");
console.log("meshes", root.listMeshes().length, "nodes", root.listNodes().length);

export const HARDWARE = /screw|bolt|nut\b|locknut|washer|spacer|standoff|bearing|rivet|shoulder\b|\bHSI\b|BHCS|SHCS|insert|pin\b|collar|zip|tie|e-clip|retaining ring|spring/i;

const IN = 0.0254;
const tris = (mesh) => mesh.listPrimitives().reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute("POSITION").getCount()) / 3, 0);

function stats(node) {
  // triangles, hardware triangles, bounds, below this node
  let t = 0, hw = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  node.traverse((n) => {
    const m = n.getMesh();
    if (!m) return;
    const k = tris(m);
    t += k;
    let p = n, isHw = false;
    while (p) { if (HARDWARE.test(p.getName())) { isHw = true; break; } p = p.getParentNode(); if (p === node) break; }
    if (isHw) hw += k;
    const W = n.getWorldMatrix();
    for (const prim of m.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const a = pos.getMin([]), b = pos.getMax([]);
      for (let c = 0; c < 8; c++) {
        const v = [c & 1 ? b[0] : a[0], c & 2 ? b[1] : a[1], c & 4 ? b[2] : a[2]];
        for (let r = 0; r < 3; r++) {
          const w = W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r];
          min[r] = Math.min(min[r], w); max[r] = Math.max(max[r], w);
        }
      }
    }
  });
  return { t, hw, min, max };
}

const f = (v) => (v / IN).toFixed(1);
function show(node, d) {
  const name = node.getName();
  const kids = node.listChildren();
  const s = stats(node);
  if (!s.t) return;
  const box = `x ${f(s.min[0])}..${f(s.max[0])}  y ${f(s.min[1])}..${f(s.max[1])}  z ${f(s.min[2])}..${f(s.max[2])}`;
  console.log(`${"  ".repeat(d)}${name.slice(0, 60)}  [${kids.length}]  tris ${Math.round(s.t / 1000)}k (hw ${Math.round(s.hw / 1000)}k)  ${box}`);
  if (d < +depthArg) for (const k of kids) if (k.listChildren().length || d < 2) show(k, d + 1);
}
for (const n of root.listScenes()[0].listChildren()) show(n, 0);
