// Figures: each project's object drawn as lines from its CAD (see lines.js),
// on its own canvas, moving when hovered or under the pointer.
//
// createFigure(kind, canvas) returns a handle once the model is in:
//   boxes      { rest, all }: camera-space boxes (metres) round the object at
//              rest and round every pose it can take. Lay the canvas out to
//              `all`'s aspect (place(slot) does it for a slot), then call layout().
//   layout()   frames `all` exactly on the canvas as it's now sized, and draws.
//   silhouette()  the object at rest as an opaque-on-clear canvas, for masking fluid.
//   hover(on)  the Works preview: move while hovered, settle back after.
//   point(px, py) / leave()  a project page: px, py are 0..1 across and up
//              the canvas; each returns the read-out text.
//   destroy()
import * as frc987 from "./frc987.js";
import * as stand from "./stand.js";
import * as rival from "./rival.js";
import { lineView, loadModel, THREE } from "./lines.js";

export const KINDS = { "frc-987-offseason": frc987, "low-profile-monitor-stand": stand, "rival-robotics-2024": rival };

/** Starts fetching a project's model, if it has one. */
export function preloadFigure(slug) {
  const url = KINDS[slug]?.config.url;
  if (url) loadModel(url).catch(() => {});
}

export async function createFigure(slug, canvas, { reducedMotion = false } = {}) {
  const kind = KINDS[slug];
  if (!kind) return null;
  const { az, el, sil, look } = kind.config;
  const view = lineView(canvas, { az, el, sil });
  if (look) view.aim(new THREE.Vector3(...look));
  const fig = await kind.make(view);
  const boxes = fig.boxes();

  let raf = 0, last = 0, alive = true;
  const loop = (now) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const moving = reducedMotion ? (fig.jump(), fig.step(0), false) : fig.step(dt);
    view.draw();
    if (moving) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  return {
    boxes,
    /** The canvas box that fills a slot with the object at rest (see placeFigure). */
    place: (slot) => placeFigure(boxes, slot),
    layout() { view.frameTo(boxes.all); fig.step(0); view.draw(); },
    silhouette: () => { fig.step(0); return view.silhouette(); },
    hover(on) { fig.hover(on); wake(); },
    point(px, py) { const r = fig.point(px, py); wake(); return r; },
    leave() { const r = fig.leave(); wake(); return r; },
    destroy() { alive = false; cancelAnimationFrame(raf); view.dispose(); },
  };
}

/**
 * Where to put a figure's canvas so its object at rest fills a slot: `slot`
 * is { cx, cy, size } in px (size: the rest pose's longer side). Returns the
 * canvas box { x, y, w, h } in px; it reaches past the slot wherever a pose
 * can.
 */
export function placeFigure(boxes, slot) {
  const { rest, all } = boxes;
  const s = slot.size / Math.max(rest.max.x - rest.min.x, rest.max.y - rest.min.y);
  const rcx = (rest.min.x + rest.max.x) / 2, rcy = (rest.min.y + rest.max.y) / 2;
  return {
    x: slot.cx - (rcx - all.min.x) * s,
    y: slot.cy - (all.max.y - rcy) * s,
    w: (all.max.x - all.min.x) * s,
    h: (all.max.y - all.min.y) * s,
    scale: s,
  };
}
