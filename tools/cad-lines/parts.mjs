// node parts.mjs <model.glb> <assembly name prefix> — lists that assembly's parts (not hardware) with world bounds in inches.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [file, prefix, all] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const HARDWARE = /screw|bolt|nut\b|locknut|washer|spacer|standoff|rivet|\bHSI\b|BHCS|SHCS|insert|collar|e-clip|retaining ring/i;
const IN = 0.0254, f = (v) => (v / IN).toFixed(2);
const top = doc.getRoot().listNodes().find((n) => n.getName().startsWith(prefix));
const rows = [];
top.traverse((n) => {
  const m = n.getMesh();
  if (!m) return;
  let p = n, name = "";
  while (p && p !== top) { if (/occurrence of|Kraken|Swerve/.test(p.getName())) { name = p.getName(); break; } p = p.getParentNode(); }
  name ||= n.getName();
  if (!all && HARDWARE.test(name)) return;
  const W = n.getWorldMatrix();
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let t = 0;
  for (const prim of m.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    t += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
    const a = pos.getMin([]), b = pos.getMax([]);
    for (let c = 0; c < 8; c++) {
      const v = [c & 1 ? b[0] : a[0], c & 2 ? b[1] : a[1], c & 4 ? b[2] : a[2]];
      for (let r = 0; r < 3; r++) { const w = W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]; min[r] = Math.min(min[r], w); max[r] = Math.max(max[r], w); }
    }
  }
  rows.push(`${name.replace("occurrence of ", "").slice(0, 58).padEnd(58)} ${String(Math.round(t / 1000)).padStart(4)}k  x ${f(min[0])}..${f(max[0])}  y ${f(min[1])}..${f(max[1])}  z ${f(min[2])}..${f(max[2])}`);
});
console.log(rows.sort().join("\n"));
