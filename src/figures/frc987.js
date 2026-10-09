// FRC 987's 2025 offseason robot, from its CAD (public/assets/projects/
// frc-987-lines.glb, made by tools/cad-lines/prepare.mjs): five bodies in
// world space, metres, z up — static, stage, carriage, arm, intake. The stage
// and carriage slide up, the arm turns at the shoulder and swings over the
// back, the intake swings on its pivot out to the floor.
//
// One number poses it all, the cycle: 0 is the intake out on the floor, REST
// is everything stowed, 1 is the elevator out and the arm at its angle.
import { spring, pin, THREE } from "./lines.js";

const IN = 0.0254;
const URL = "/assets/projects/frc-987-lines.glb";
const SHOULDER = new THREE.Vector3(0, 0, 38.85 * IN);     // the arm's X-contact bearings, axis along x
const INTAKE = new THREE.Vector3(0, -12.4 * IN, 11.5 * IN); // the intake's pivot bearings, axis along x
const STOW = 143.686355;                                  // degrees from deployed (as modelled) to stowed
const ARM_TOP = 68.359879;                                // the arm's angle above level, at the top
const STAGE_RUN = (65 - 38.5) * IN;                       // the elevator's own rise
const REST = 0.22;
const HOVER = 0.68;                                       // how far a hover in Works runs the cycle

export const config = { az: -38, el: 24, sil: [0.012, 0.03], look: [0, -0.05, 1.05], url: URL };

const ease = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
/** A body that turns about an axis along x through point p: outer.rotation.x turns it. */
function hinge(obj, p) {
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.position.copy(p); inner.position.copy(p).negate();
  inner.add(obj); outer.add(inner);
  return outer;
}
/** The arm's rotation for an angle above level: it hangs straight down at 0, so up and over the back is 90° + angle. */
const armAngle = (deg) => THREE.MathUtils.degToRad(90 + deg);

export async function make(view) {
  const root = await view.model(URL);
  const take = (n) => { const o = root.getObjectByName(n); o.removeFromParent(); const g = new THREE.Group(); g.add(o); return g; };
  const b = {
    static: take("static"), stage: take("stage"), carriage: take("carriage"),
    arm: hinge(take("arm"), SHOULDER), intake: hinge(take("intake"), INTAKE),
  };
  b.armRide = new THREE.Group(); b.armRide.add(b.arm);
  view.scene.add(b.static, b.stage, b.carriage, b.armRide, b.intake);
  view.scene.updateMatrixWorld(true);

  // The intake stows by turning up to stand upright. Both ways round raise
  // it; stowed is the one that ends higher (the other folds into the elevator).
  const heightAt = (sign) => {
    b.intake.rotation.x = sign * THREE.MathUtils.degToRad(STOW); view.scene.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(b.intake).getCenter(new THREE.Vector3()).z;
  };
  const stowSign = heightAt(1) > heightAt(-1) ? 1 : -1;
  b.intake.rotation.x = 0;
  // The carriage sits at the top of the stage as modelled, so it rides up
  // with it, the stage's whole run. (Derived from the arm's 87.77" instead,
  // it came out 7" short and slid down the stage.)
  const carriageRun = STAGE_RUN;

  // The parts its page labels (from Daniel's write-up and his numbers), and
  // the pose that shows each.
  const notes = [
    { id: "intake", label: "Ground intake", sub: "swings 144° out to the floor", obj: b.intake, at: pin(view, b.intake, [0.5, 0.5, 0.5]), cycle: 0 },
    { id: "elevator", label: "Elevator, belt driven", sub: "38.5 to 65 in", obj: b.stage, at: pin(view, b.stage, [0.5, 0.5, 0.92]), cycle: 0.75 },
    { id: "arm", label: "Scoring arm, carbon fiber", sub: "the gripper's belt runs through it", obj: b.arm, at: pin(view, b.arm, [0.5, 0.5, 0.5]), cycle: 1 },
  ];
  const level = (c) => (c < REST - 0.001 ? "intake" : c <= REST + 0.001 ? "rest" : `L${Math.min(4, Math.max(1, Math.ceil(((c - REST) / (1 - REST)) * 4)))}`);

  const pose = (e) => {
    const run = ease((e - 0.24) / 0.76);
    b.stage.position.z = STAGE_RUN * run;
    b.carriage.position.z = carriageRun * run;
    b.armRide.position.z = carriageRun * run;
    b.arm.rotation.x = armAngle(-90 + (ARM_TOP + 90) * ease((e - 0.27) / 0.73));
    b.intake.rotation.x = stowSign * THREE.MathUtils.degToRad(STOW) * ease(e / REST);
  };

  const cycle = spring(REST);
  // The pointer's height, bottom (0) to top (1): the lower 40% is the
  // intake's (all the way out in the bottom 15%), above runs the elevator.
  const INTAKE_OUT = 0.15, INTAKE_ZONE = 0.4;
  const cycleAt = (p) => p < INTAKE_ZONE
    ? REST * Math.max(0, (p - INTAKE_OUT) / (INTAKE_ZONE - INTAKE_OUT))
    : REST + (1 - REST) * Math.min(1, (p - INTAKE_ZONE) / (0.95 - INTAKE_ZONE));

  return {
    /** Camera-space boxes: at rest, and round every pose. */
    boxes() {
      pose(0); const all = view.box();
      pose(1); view.box(all);
      pose(REST); const rest = view.box();
      view.box(all);
      return { rest, all };
    },
    step(dt) { const m = cycle.step(dt); pose(cycle.x); return m; },
    jump() { cycle.jump(cycle.t); },
    /** Hovered in Works: up most of the way (the whole way would take the arm off the top of the screen); let go, back to rest. */
    hover(on) { cycle.t = on ? HOVER : REST; },
    point(_px, py) {
      cycle.t = cycleAt(py);
      return py < INTAKE_ZONE ? "intake" : `L${Math.min(4, Math.max(1, Math.ceil(((py - INTAKE_ZONE) / (0.95 - INTAKE_ZONE)) * 4)))}`;
    },
    leave() { cycle.t = REST; return "rest"; },
    notes,
    show(id) { const n = notes.find((m) => m.id === id); if (n) cycle.t = n.cycle; return level(cycle.t); },
  };
}
