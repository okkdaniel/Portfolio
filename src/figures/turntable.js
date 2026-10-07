// A part with nothing that moves on it, so it turns instead: hovered (in
// Works) it spins slowly, and let go it comes back round to rest by the short
// way; under the pointer (a project page) its position across sets the turn,
// a full turn edge to edge with rest in the middle. It turns about the
// vertical through its middle.
import { spring, THREE } from "./lines.js";

const SPIN = 45; // degrees a second while hovered

/** Wraps an object so it turns about the vertical through its centre; returns the turning group and the centre. */
export function turnable(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const centre = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group(); inner.position.copy(centre).negate(); inner.add(obj);
  const outer = new THREE.Group(); outer.position.copy(centre); outer.add(inner);
  return { group: outer, centre, radius: box.getBoundingSphere(new THREE.Sphere()).radius };
}

export function turntable(view, group) {
  const turn = spring(0);
  let spinning = false;
  const pose = (deg) => { group.rotation.z = THREE.MathUtils.degToRad(deg); };
  return {
    boxes() {
      pose(0); const rest = view.box(), all = rest.clone();
      for (let d = 15; d < 360; d += 15) { pose(d); view.box(all); }
      pose(0);
      return { rest, all };
    },
    step(dt) {
      if (spinning) { turn.t += SPIN * dt; turn.x = turn.t; turn.v = 0; pose(turn.x); return true; }
      const m = turn.step(dt); pose(turn.x); return m;
    },
    jump() { turn.jump(turn.t); },
    hover(on) {
      spinning = on;
      if (!on) { const back = Math.round(turn.x / 360) * 360; turn.t = back; }
    },
    point(px) { spinning = false; turn.t = (px - 0.5) * 360; return `${Math.round(((turn.t % 360) + 360) % 360)}°`; },
    leave() { turn.t = 0; return "rest"; },
  };
}
