// FRC 987's 2025 offseason robot, drawn from its CAD as lines on paper (see
// ../lines.js for how).
//
// The model (public/assets/projects/frc-987-lines.glb, made by
// tools/cad-lines/prepare.mjs) holds five bodies in world space, in metres,
// z up: static, stage, carriage, arm, intake. Here they're posed: the stage
// and carriage slide up, the arm turns at the shoulder, the intake swings on
// its pivot.
//
// The pointer's height is the cycle: low, the intake swings out to the floor;
// higher, it stows, and the elevator and arm rise through four levels.
import { lineView, spring, THREE } from "../lines.js";

const IN = 0.0254;
const SHOULDER = new THREE.Vector3(0, 0, 38.85 * IN);     // the arm's X-contact bearings, axis along x
const INTAKE = new THREE.Vector3(0, -12.4 * IN, 11.5 * IN); // the intake's pivot bearings, axis along x
const STOW = 143.686355;                                  // degrees from deployed (as modelled) to stowed
const TOP = 87.771642 * IN;                               // the arm's tip, elevator out and arm at its angle
const STAGE_RUN = (65 - 38.5) * IN;                       // the elevator's own rise

const canvas = document.getElementById("c"), read = document.getElementById("read");
const view = lineView(canvas, { az: -38, el: 24, sil: [0.012, 0.03] });
view.aim(new THREE.Vector3(0, -0.05, 1.05));

const bodies = {};
let carriageRun = STAGE_RUN, armSign = 1, stowSign = 1, dirty = true;
/** A body that turns about an axis along x through point p: outer.rotation.x turns it. */
function hinge(obj, p) {
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.position.copy(p); inner.position.copy(p).negate();
  inner.add(obj); outer.add(inner);
  return outer;
}
/** The arm's rotation for an angle above level: it hangs straight down at 0, so up and over the back is 90° + angle, toward +y. */
const armAngle = (deg) => armSign * THREE.MathUtils.degToRad(90 + deg);

// ---- the cycle ----
const angleIn = document.getElementById("angle"), angleOut = document.getElementById("angleOut");
let topAngle = +angleIn.value;
angleIn.addEventListener("input", () => { topAngle = +angleIn.value; angleOut.textContent = `${topAngle.toFixed(2)}°`; dirty = true; });

const ease = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const REST = 0.22;
const cycle = spring(REST);
function pose(e) {
  const run = ease((e - 0.24) / 0.76);
  bodies.stage.position.z = STAGE_RUN * run;
  bodies.carriage.position.z = carriageRun * run;
  bodies.armRide.position.z = carriageRun * run;
  bodies.arm.rotation.x = armAngle(-90 + (topAngle + 90) * ease((e - 0.27) / 0.73));
  bodies.intake.rotation.x = stowSign * THREE.MathUtils.degToRad(STOW) * ease(e / REST);
}

// The camera frames the robot at rest joined with however it's posed now, so
// it eases out as the elevator and arm rise, and back in as they come down.
let restBox = null;

view.load("/assets/projects/frc-987-lines.glb").then((gltf) => {
  const take = (n) => { const o = gltf.scene.getObjectByName(n); o.removeFromParent(); const g = new THREE.Group(); g.add(o); return g; };
  bodies.static = take("static");
  bodies.stage = take("stage");
  bodies.carriage = take("carriage");
  bodies.arm = hinge(take("arm"), SHOULDER);
  bodies.intake = hinge(take("intake"), INTAKE);
  bodies.armRide = new THREE.Group(); bodies.armRide.add(bodies.arm);
  view.scene.add(bodies.static, bodies.stage, bodies.carriage, bodies.armRide, bodies.intake);
  view.scene.updateMatrixWorld(true);

  // The intake stows by turning up to stand upright. Both ways round raise
  // it; stowed is the one that ends higher (the other folds into the elevator).
  const heightAt = (sign) => {
    bodies.intake.rotation.x = sign * THREE.MathUtils.degToRad(STOW); view.scene.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(bodies.intake).getCenter(new THREE.Vector3()).z;
  };
  stowSign = heightAt(1) > heightAt(-1) ? 1 : -1;
  bodies.intake.rotation.x = 0;

  // How far the carriage rides: far enough that, at the elevator's top and
  // the arm at 68.36° above level, the arm's highest point is 87.77".
  bodies.arm.rotation.x = armAngle(68.359879); view.scene.updateMatrixWorld(true);
  carriageRun = TOP - new THREE.Box3().setFromObject(bodies.arm).max.z;
  bodies.arm.rotation.x = 0;

  pose(0); const out = view.box();
  pose(REST); restBox = view.box(out.clone());   // rest, with room for the intake out
  view.frame = view.frameFor(restBox);
  view.resize();
  read.textContent = "rest";
  requestAnimationFrame(tick);
});

// Where the pointer is, bottom (0) to top (1) of the drawing, and what that asks for.
// The lower 40% is the intake's: the bottom 15% has it all the way out, the
// rest of that swings it between out and stowed. Above, the elevator and arm
// run from stowed to the top level.
const INTAKE_OUT = 0.15, INTAKE_ZONE = 0.4;
function cycleAt(p) {
  if (p < INTAKE_ZONE) return REST * Math.max(0, (p - INTAKE_OUT) / (INTAKE_ZONE - INTAKE_OUT));
  return REST + (1 - REST) * Math.min(1, (p - INTAKE_ZONE) / (0.95 - INTAKE_ZONE));
}
canvas.addEventListener("pointermove", (ev) => {
  const r = canvas.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (r.bottom - ev.clientY) / r.height));
  cycle.t = cycleAt(p);
  const lv = p < INTAKE_ZONE ? 0 : Math.min(4, Math.max(1, Math.ceil(((p - INTAKE_ZONE) / (0.95 - INTAKE_ZONE)) * 4)));
  read.textContent = lv === 0 ? "intake" : `L${lv}`;
});
canvas.addEventListener("pointerleave", () => { cycle.t = REST; read.textContent = "rest"; });

let last = performance.now(), zooming = false;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const moving = cycle.step(dt);
  if (moving || dirty || zooming) {
    dirty = false;
    pose(cycle.x);
    zooming = view.ease(view.frameFor(view.box(restBox.clone())));
    view.draw();
  }
  requestAnimationFrame(tick);
}
addEventListener("resize", () => { view.resize(); dirty = true; });
window.__fig = { set: (v) => { cycle.jump(v); dirty = true; } };
