// A PLACEHOLDER for the Rival Robotics 2024 robot until its CAD exists: a
// plain six-wheel drivetrain built here from boxes and cylinders, in metres,
// with a kicker block and the two Limelight cameras, on a turntable. Replace
// it with the real model (tools/cad-lines/prepare.mjs) once there is one.
import { THREE } from "./lines.js";
import { turnable, turntable } from "./turntable.js";

export const config = { az: -38, el: 24, sil: [0.004, 0.012] };

function robot(material) {
  const g = new THREE.Group();
  const add = (geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const box = (w, d, h, x, y, z) => add(new THREE.BoxGeometry(w, d, h), x, y, z);
  // The chassis: two side rails and a belly pan, wheels outboard.
  box(0.04, 0.42, 0.05, -0.17, 0, 0.06);
  box(0.04, 0.42, 0.05, 0.17, 0, 0.06);
  box(0.30, 0.40, 0.012, 0, 0, 0.045);
  box(0.30, 0.04, 0.05, 0, -0.19, 0.06);
  box(0.30, 0.04, 0.05, 0, 0.19, 0.06);
  // Six wheels, three down each side, the middle pair dropped a little.
  for (const x of [-0.215, 0.215]) {
    for (const [y, z] of [[-0.15, 0.052], [0, 0.048], [0.15, 0.052]]) {
      const w = add(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 28), x, y, z);
      w.rotation.z = Math.PI / 2;
    }
  }
  // The kicker and the roller ahead of it.
  box(0.22, 0.10, 0.10, 0, -0.08, 0.14);
  const roller = add(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 20), 0, -0.2, 0.11);
  roller.rotation.z = Math.PI / 2;
  // The two cameras: one on a short mast at the back, one low at the front.
  box(0.03, 0.03, 0.14, 0.06, 0.13, 0.15);
  box(0.09, 0.05, 0.06, 0.06, 0.13, 0.25);
  box(0.09, 0.05, 0.06, -0.08, -0.17, 0.12);
  return g;
}

export async function make(view) {
  const { group, centre } = turnable(robot(view.material));
  view.scene.add(group);
  view.aim(centre);
  return turntable(view, group);
}
