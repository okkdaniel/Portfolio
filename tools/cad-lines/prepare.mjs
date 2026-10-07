// node prepare.mjs <in.glb> <out.glb> [--single | --rival]
//
// --single: a one-piece part (the monitor stand). Everything goes into one
// body, "part", and nothing is simplified.
// --rival: Rival Robotics' 2025C-LL (FTC): static (drivetrain 100, the struts,
// the elevator's fixed stage 211), stage (212, the moving stage), carriage
// (213), wrist (220, the intake, which turns on the carriage). It's small and
// its drivetrain is dense, so it's simplified harder, to a finer error.
//
// Turns the FRC 987 offseason robot's CAD export into a small model the site
// draws as lines: hardware dropped, every part sorted into the body it moves
// with, each body's parts merged into one mesh in world space, simplified,
// quantized and meshopt-compressed. Writes a sidecar <out>.json with the
// joints, measured from the parts that form them.
//
// Bodies: static (chassis, elevator frame, intake mount, 24000), stage (the
// elevator's moving stage, 21200), carriage (21300, and 22000V2's plates and
// pivot drive), arm (what turns at the shoulder), intake (23200).
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { weld, simplify, quantize, dedup, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import { writeFileSync } from "node:fs";

const [src, out, mode] = process.argv.slice(2);
const SINGLE = mode === "--single", RIVAL = mode === "--rival";
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(src);

const DROP = /screw|bolt|\bnut\b|locknut|washer|spacer|standoff|bearing|rivet|\bHSI\b|BHCS|SHCS|insert|collar|e-clip|retaining|1\/2" Hex \(|3\/8" Hex \(|Hex \(\d|Round Shaft|Shoulder \(|Origin Cat|693-2Z|7804K|Hex Drive Fl/i;
const ARM = /CarbonTube|ShoulderArmMount|ShoulderBevelGear|BilletEndcap|BearingSleeve|Bevel Gear|18t x 9mm|246T/;

const ancestors = (n) => { const a = []; for (let p = n; p; p = p.getParentNode()) a.push(p.getName()); return a; };
const worldBox = (n) => {
  const W = n.getWorldMatrix(), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const prim of n.getMesh().listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), a = pos.getMin([]), b = pos.getMax([]);
    for (let c = 0; c < 8; c++) {
      const v = [c & 1 ? b[0] : a[0], c & 2 ? b[1] : a[1], c & 4 ? b[2] : a[2]];
      for (let r = 0; r < 3; r++) { const w = W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]; min[r] = Math.min(min[r], w); max[r] = Math.max(max[r], w); }
    }
  }
  return { min, max };
};
const IN = 0.0254;

function bodyOf(n) {
  if (SINGLE) return "part";
  if (RIVAL) {
    const names = ancestors(n), all = names.join(" / ");
    if (names.some((s) => DROP.test(s))) return null;
    if (all.includes("2025C-220")) return "wrist";
    if (all.includes("2025C-213")) return "carriage";
    if (all.includes("2025C - 212")) return "stage";
    return "static";
  }
  const names = ancestors(n), all = names.join(" / ");
  if (names.some((s) => DROP.test(s))) return null;
  if (all.includes("2025O-25000")) return null;
  if (all.includes("2025O-21200")) return "stage";
  if (all.includes("2025O-21300")) return "carriage";
  if (all.includes("2025O-22000V2")) {
    const { min } = worldBox(n);
    return min[2] < 30 * IN || names.some((s) => ARM.test(s)) ? "arm" : "carriage";
  }
  if (all.includes("2025O-23200")) return "intake";
  return "static";
}

// Gather each body's triangles in world space.
const bodies = {};
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh();
  if (!m) continue;
  const b = bodyOf(n);
  if (!b) continue;
  const W = n.getWorldMatrix();
  const acc = (bodies[b] ||= { pos: [], idx: [], heavy: ancestors(n).join(" ").includes("2025O-24000") });
  for (const prim of m.listPrimitives()) {
    const pos = prim.getAttribute("POSITION").getArray();
    const base = acc.pos.length / 3;
    for (let i = 0; i < pos.length; i += 3) {
      const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
      acc.pos.push(W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]);
    }
    const ind = prim.getIndices()?.getArray() ?? Array.from({ length: pos.length / 3 }, (_, i) => i);
    for (const i of ind) acc.idx.push(base + i);
  }
}

// One document, one node per body, one mesh each.
const outDoc = new Document();
const buf = outDoc.createBuffer();
const scene = outDoc.createScene("robot");
const mat = outDoc.createMaterial("paper").setBaseColorFactor([1, 1, 1, 1]);
for (const [name, b] of Object.entries(bodies)) {
  const prim = outDoc.createPrimitive()
    .setAttribute("POSITION", outDoc.createAccessor().setType("VEC3").setArray(new Float32Array(b.pos)).setBuffer(buf))
    .setIndices(outDoc.createAccessor().setType("SCALAR").setArray(new Uint32Array(b.idx)).setBuffer(buf))
    .setMaterial(mat);
  scene.addChild(outDoc.createNode(name).setMesh(outDoc.createMesh(name).addPrimitive(prim)));
  console.log(name, "triangles", (b.idx.length / 3) | 0);
}

await outDoc.transform(
  weld({ tolerance: 0.00005 }),
  ...(SINGLE ? [] : [simplify({ simplifier: MeshoptSimplifier, ratio: RIVAL ? 0.05 : 0.12, error: RIVAL ? 0.00025 : 0.0004 })]),
  dedup(), prune(),
  quantize({ quantizePosition: 16 }),
);
for (const m of outDoc.getRoot().listMeshes()) {
  const p = m.listPrimitives()[0];
  console.log("  ->", m.getName(), ((p.getIndices().getCount() / 3) | 0), "triangles");
}
outDoc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(out, outDoc);
