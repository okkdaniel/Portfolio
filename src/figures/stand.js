// The low rise monitor stand, from its CAD (public/assets/projects/
// monitor-stand-lines.glb, made by tools/cad-lines/prepare.mjs --single): one
// sheet-metal part, about 5.8 × 4 × 4.2 in, on a turntable.
import { turnable, turntable } from "./turntable.js";

const URL = "/assets/projects/monitor-stand-lines.glb";
export const config = { az: -38, el: 24, sil: [0.0012, 0.0035], url: URL };

export async function make(view) {
  const { group, centre } = turnable(await view.model(URL));
  view.scene.add(group);
  view.aim(centre);
  return turntable(view, group);
}
