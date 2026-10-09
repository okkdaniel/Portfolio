// Rival Robotics' 2025C-LL, an FTC robot, from its CAD (public/assets/
// projects/rival-2025c-lines.glb, made by tools/cad-lines/prepare.mjs
// --rival): four bodies in world space, metres, z up. A mecanum drivetrain
// with an elevator leaning forward 32.7° (static: the drivetrain, the struts
// and the elevator's fixed stage), its moving stage, the carriage riding it,
// and the intake on the carriage, which turns on its pivot: the wrist.
//
// One number poses it all, the cycle: 0 is the intake turned down to the
// floor in front, REST is as modelled, 1 is the elevator out and the wrist
// tipped out forward, as far as reaches furthest. Shown in isometric view,
// drawn a little smaller than the others (it reads large otherwise).
import { spring, pin, THREE } from "./lines.js";

const IN = 0.0254;
const URL = "/assets/projects/rival-2025c-lines.glb";
// Measured from the CAD by tools/cad-lines/rivaljoints.mjs.
const AXIS = new THREE.Vector3(0, -0.539, 0.841).normalize(); // up the elevator (its stage tubes' long axis)
const PIVOT = new THREE.Vector3(0, 1.037 * IN, 4.684 * IN);    // the wrist's pivot (its 36T pulley), axis along x
// How far things go, checked against the CAD for clearance all the way
// (the floor, the drivetrain, the elevator); the elevator's runs are estimates.
const WRIST_DOWN = 44;     // degrees the intake turns down at the bottom, short of the drivetrain (it meets it at 48°)
const WRIST_TOP = 35;      // degrees it tips out as the elevator rises: the least that reaches
                           // furthest forward (14.7 in ahead of the middle, from 35° to 42.5°)
const STAGE_RUN = 5.5 * IN;  // the moving stage's travel up the elevator
const CARRIAGE_RUN = 5.5 * IN; // the carriage's travel on the stage
const REST = 0.25;
const HOVER = 0.85;        // how far a hover in Works runs the cycle

// Isometric: the front and the side at the same angle, from the front
// right, looking down 35.26° (atan of 1/√2).
export const config = { az: -45, el: 35.26, sil: [0.004, 0.012], url: URL, scale: 0.85 };

const ease = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
/** A body that turns about an axis along x through point p: outer.rotation.x turns it. */
function hinge(obj, p) {
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.position.copy(p); inner.position.copy(p).negate();
  inner.add(obj); outer.add(inner);
  return outer;
}

export async function make(view) {
  const root = await view.model(URL);
  const take = (n) => { const o = root.getObjectByName(n); o.removeFromParent(); const g = new THREE.Group(); g.add(o); return g; };
  const b = { static: take("static"), stage: take("stage"), carriage: take("carriage"), wrist: hinge(take("wrist"), PIVOT) };
  // The wrist rides with the carriage.
  b.wristRide = new THREE.Group(); b.wristRide.add(b.wrist);
  view.scene.add(b.static, b.stage, b.carriage, b.wristRide);
  view.scene.updateMatrixWorld(true);
  view.aim(new THREE.Box3().setFromObject(view.scene).getCenter(new THREE.Vector3()));

  // The parts its page labels (from the CAD), and the pose that shows each.
  // The front faces -y; the camera looks from the front right.
  const notes = [
    { id: "drive", label: "Mecanum drive", obj: b.static, at: pin(view, b.static, [1, 0.02, 0.08]), cycle: REST },
    { id: "elevator", label: "Elevator, two stages", sub: "leaning 33° forward", obj: b.stage, at: pin(view, b.stage, [0.5, 0.5, 1]), cycle: 1 },
    { id: "wrist", label: "Intake, on a wrist", obj: b.wrist, at: pin(view, b.wrist, [0.5, 0, 0.5]), cycle: 0 },
  ];

  const deg = THREE.MathUtils.degToRad;
  const pose = (e) => {
    const up = ease((e - REST) / (1 - REST));
    b.stage.position.copy(AXIS).multiplyScalar(STAGE_RUN * up);
    b.carriage.position.copy(AXIS).multiplyScalar((STAGE_RUN + CARRIAGE_RUN) * up);
    b.wristRide.position.copy(b.carriage.position);
    b.wrist.rotation.x = e < REST ? deg(WRIST_DOWN) * (1 - ease(e / REST)) : deg(WRIST_TOP) * up;
  };

  const cycle = spring(REST);
  // The pointer's height, bottom (0) to top (1): the lower 40% is the
  // intake's (all the way down in the bottom 15%), above runs the elevator.
  const INTAKE_OUT = 0.15, INTAKE_ZONE = 0.4;
  const cycleAt = (p) => p < INTAKE_ZONE
    ? REST * Math.max(0, (p - INTAKE_OUT) / (INTAKE_ZONE - INTAKE_OUT))
    : REST + (1 - REST) * Math.min(1, (p - INTAKE_ZONE) / (0.95 - INTAKE_ZONE));
  const read = (e) => e < REST - 0.001 ? "intake"
    : e <= REST + 0.001 ? "rest"
    : `elevator ${Math.round(((STAGE_RUN + CARRIAGE_RUN) * ease((e - REST) / (1 - REST))) / IN)} in`;

  return {
    /** Camera-space boxes: at rest, and round every pose. */
    boxes() {
      pose(0); const all = view.box();
      for (let k = 1; k <= 8; k++) { pose(k / 8); view.box(all); }
      pose(REST); const rest = view.box();
      view.box(all);
      return { rest, all };
    },
    step(dt) { const m = cycle.step(dt); pose(cycle.x); return m; },
    jump() { cycle.jump(cycle.t); },
    /** Hovered in Works: the elevator most of the way up; let go, back to rest. */
    hover(on) { cycle.t = on ? HOVER : REST; },
    point(_px, py) { cycle.t = cycleAt(py); return read(cycle.t); },
    leave() { cycle.t = REST; return "rest"; },
    notes,
    show(id) { const n = notes.find((m) => m.id === id); if (n) cycle.t = n.cycle; return read(cycle.t); },
  };
}
