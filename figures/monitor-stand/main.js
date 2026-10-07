// The low rise monitor stand, drawn from its CAD as lines on paper (see
// ../lines.js for how). One sheet-metal part, so nothing moves on it: the
// pointer turns it instead. Across the drawing turns it round (a full turn
// from edge to edge, the rest pose in the middle); up and down tilts the view
// from nearly level to looking down into the base. The frame holds still:
// it's sized to the part's bounding sphere, so no turn or tilt leaves it.
import { lineView, spring, THREE } from "../lines.js";

const REST_EL = 24, LOW_EL = 6, HIGH_EL = 62;

const canvas = document.getElementById("c"), read = document.getElementById("read");
const view = lineView(canvas, { az: -38, el: REST_EL, sil: [0.0012, 0.0035] });
const turn = spring(0), tilt = spring(REST_EL);
let part, centre = new THREE.Vector3(), radius = 0.1, dirty = true;

/** Places the camera at an elevation, looking at the part's centre. */
function aim(el) {
  const a = THREE.MathUtils.degToRad(-38), e = THREE.MathUtils.degToRad(el);
  view.camera.position.copy(centre).add(new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)).multiplyScalar(10));
  view.camera.lookAt(centre);
  view.camera.updateMatrixWorld();
}

view.load("/assets/projects/monitor-stand-lines.glb").then((gltf) => {
  // The part turns about the vertical through its centre.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  centre = box.getCenter(new THREE.Vector3());
  radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const inner = new THREE.Group(); inner.position.copy(centre).negate(); inner.add(gltf.scene);
  part = new THREE.Group(); part.position.copy(centre); part.add(inner);
  view.scene.add(part);
  view.frame = { cx: 0, cy: 0, h: radius * 1.06 * Math.max(1, canvas.clientWidth / canvas.clientHeight < 1 ? canvas.clientHeight / canvas.clientWidth : 1) };
  view.resize();
  read.textContent = "rest";
  requestAnimationFrame(tick);
});

canvas.addEventListener("pointermove", (ev) => {
  const r = canvas.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  const py = Math.min(1, Math.max(0, (r.bottom - ev.clientY) / r.height));
  turn.t = (px - 0.5) * 360;
  tilt.t = LOW_EL + (HIGH_EL - LOW_EL) * py;
  const deg = Math.round(((turn.t % 360) + 360) % 360);
  read.textContent = `${deg}° · ${Math.round(tilt.t)}° up`;
});
canvas.addEventListener("pointerleave", () => { turn.t = 0; tilt.t = REST_EL; read.textContent = "rest"; });

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const m1 = turn.step(dt), m2 = tilt.step(dt);
  if (m1 || m2 || dirty) {
    dirty = false;
    part.rotation.z = THREE.MathUtils.degToRad(turn.x);
    aim(tilt.x);
    view.project();
    view.draw();
  }
  requestAnimationFrame(tick);
}
addEventListener("resize", () => { view.resize(); dirty = true; });
window.__fig = { set: (deg, el = REST_EL) => { turn.jump(deg); tilt.jump(el); dirty = true; } };
