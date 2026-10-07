// node rivaljoints.mjs <2025C-LL.glb>: Rival's elevator axis and wrist pivot,
// from the parts that form them (inches, world space, z up).
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const IN = 0.0254;
const pts = (re) => { const out = []; for (const n of doc.getRoot().listNodes()) { if (!n.getMesh() || !re.test(n.getName())) continue; const W = n.getWorldMatrix(); for (const p of n.getMesh().listPrimitives()) { const a = p.getAttribute("POSITION"); for (let i = 0; i < a.getCount(); i++) { const v = a.getElement(i, []); out.push([0, 1, 2].map((r) => (W[r] * v[0] + W[4 + r] * v[1] + W[8 + r] * v[2] + W[12 + r]) / IN)); } } } return out; };
const mean = (P) => [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / P.length);
// The long axis of the stage tubes: the main direction of their points (power iteration).
function axis(P) {
  const m = mean(P), C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of P) { const d = p.map((x, k) => x - m[k]); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
  let v = [0, -0.5, 0.8]; for (let it = 0; it < 50; it++) { const w = C.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); const l = Math.hypot(...w); v = w.map((x) => x / l); }
  if (v[2] < 0) v = v.map((x) => -x);
  return { m, v };
}
const f = (a) => a.map((x) => x.toFixed(3)).join(", ");
for (const re of [/Stage1_LeftTube/, /Stage1_RightTube/]) { const { m, v } = axis(pts(re)); console.log(re.source, "middle", f(m), "axis", f(v), "tilt from vertical", (Math.acos(v[2]) * 180 / Math.PI).toFixed(2)); }
const box = (P) => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of P) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); } return { mn, mx, c: mn.map((x, k) => (x + mx[k]) / 2) }; };
for (const re of [/HTD5 36 Tooth/, /HTD5 24 Tooth/, /Arm Mount Mitten/, /Intake Plate Left/, /Elevator Carriage Plate/]) { const b = box(pts(re)); console.log(re.source, "centre", f(b.c), "min", f(b.mn), "max", f(b.mx)); }
