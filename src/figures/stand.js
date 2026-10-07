// The low rise monitor stand, from its CAD (public/assets/projects/
// monitor-stand-lines.glb, made by tools/cad-lines/prepare.mjs --single): one
// sheet-metal part, about 5.8 × 4 × 4.2 in. A base plate on the ground, a
// wall bent up at each end of it, and a mounting tab bent in off each wall's
// sloping front edge.
//
// It has no moving parts, so it's looked over as it stands, like a part on a
// turntable: the pointer across turns it round (its front turns toward the
// pointer), and up and down looks at it from lower or higher. It keeps its
// size, turning about its own middle, and settles back to its rest view when
// let go. Hovered in Works with no pointer on it (a focus), it turns a little.
//
// The unfolding it used to do (sheet metal unrolled along the neutral
// surface, matching the CAD flat pattern) is in git history before this
// note; see vault/CAD figures.md.
import { THREE } from "./lines.js";

const URL = "/assets/projects/monitor-stand-lines.glb";
export const config = { az: -38, el: 24, sil: [0.0012, 0.0035], url: URL };

const TURN = 65;        // degrees it turns round either way, pointer at the edge
const LOOK_UP = 8;      // degrees lower the view goes, pointer at the top (24° to 16° down)
const LOOK_DOWN = 14;   // degrees higher, pointer at the bottom (24° to 38° down); kept small
                        // so it reads as turning on the ground, not tumbling
const HOVER = [28, 4];  // turn and rise for a hover with no pointer on it
const IN = 0.0254;

/** A softer spring than the robots': a part with some weight on a turntable. */
function settle(x) {
  return {
    x, v: 0, t: x,
    step(dt) {
      this.v += (42 * (this.t - this.x) - 12.5 * this.v) * dt;
      this.x += this.v * dt;
      const moving = Math.abs(this.v) > 1e-3 || Math.abs(this.t - this.x) > 1e-3;
      if (!moving) { this.x = this.t; this.v = 0; }
      return moving;
    },
    jump(v) { this.t = this.x = v; this.v = 0; },
  };
}

export async function make(view) {
  const root = await view.model(URL);
  const box = new THREE.Box3().setFromObject(root);
  const mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  // Turns about its middle: the model sits in `inner`, moved so its middle is
  // at the group's origin, and the group stands at that middle.
  const inner = new THREE.Group(); inner.add(root); inner.position.copy(mid).negate();
  const group = new THREE.Group(); group.add(inner); group.position.copy(mid);
  view.scene.add(group);
  view.aim(mid);

  const az = THREE.MathUtils.degToRad(config.az), el = THREE.MathUtils.degToRad(config.el);
  const camZ = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
  const camX = new THREE.Vector3(0, 0, 1).cross(camZ).normalize();
  const UP = new THREE.Vector3(0, 0, 1), deg = THREE.MathUtils.degToRad;
  const spin = new THREE.Quaternion(), tip = new THREE.Quaternion();
  // turn: degrees round its vertical (positive turns its front to the
  // right); rise: degrees more the view looks down on it.
  const pose = (turn, rise) => {
    spin.setFromAxisAngle(UP, deg(turn));
    tip.setFromAxisAngle(camX, deg(rise));
    group.quaternion.copy(tip).multiply(spin);
  };

  const turn = settle(0), rise = settle(0);
  const dims = `${(size.x / IN).toFixed(1)} × ${(size.y / IN).toFixed(1)} × ${(size.z / IN).toFixed(1)} in`;

  return {
    /** Camera-space boxes: at rest, and round every view it turns to. */
    boxes() {
      pose(0, 0); const rest = view.box(), all = rest.clone();
      for (let i = 0; i <= 12; i++) for (const r of [-LOOK_UP, 0, LOOK_DOWN]) { pose(-TURN + (2 * TURN * i) / 12, r); view.box(all); }
      pose(turn.x, rise.x);
      return { rest, all };
    },
    step(dt) {
      const m = [turn.step(dt), rise.step(dt)].some(Boolean);
      pose(turn.x, rise.x);
      return m;
    },
    jump() { turn.jump(turn.t); rise.jump(rise.t); },
    hover(on) { turn.t = on ? HOVER[0] : 0; rise.t = on ? HOVER[1] : 0; },
    /** The pointer on it, 0..1 across and up: it turns to face it. */
    point(px, py) {
      const x = Math.max(-1, Math.min(1, (px - 0.5) * 2)), y = Math.max(-1, Math.min(1, (py - 0.5) * 2));
      turn.t = TURN * x;
      rise.t = y > 0 ? -LOOK_UP * y : LOOK_DOWN * -y;
      return dims;
    },
    leave() { turn.t = rise.t = 0; return "rest"; },
  };
}
