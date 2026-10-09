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
//              Hovered (or under the pointer), a figure also zooms in a little:
//              the camera closes in, so the halo stays its size round it.
//              It all draws at 20fps.
//   reveal(to, { duration, delay })  grows the figure in (to 1) or out (to 0),
//              from the ground up in the site's dots; created hidden.
//   point(px, py) / leave()  a project page: px, py are 0..1 across and up
//              the canvas; each returns the read-out text.
//   notes      [{ id, label, sub }]: the parts its page labels.
//   show(id)   poses it to show that part; returns the read-out text.
//   anchors()  [{ id, x, y }]: where each labelled part is now, in canvas px.
//   onFrame(fn)  calls fn after every frame drawn; returns a function to stop.
//   destroy()
import * as frc987 from "./frc987.js";
import * as stand from "./stand.js";
import * as rival from "./rival.js";
import { lineView, loadModel, THREE, HALO, ZOOM } from "./lines.js";
export { HALO };

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
  await view.warm();
  const boxes = fig.boxes();
  // `span`: `all` zoomed about the rest pose's centre, the room a pose can
  // take up at full zoom. The canvas covers it.
  const rc = new THREE.Vector2((boxes.rest.min.x + boxes.rest.max.x) / 2, (boxes.rest.min.y + boxes.rest.max.y) / 2);
  const out = (v, c) => c + (v - c) * (1 + ZOOM);
  boxes.span = new THREE.Box3(
    new THREE.Vector3(out(boxes.all.min.x, rc.x), out(boxes.all.min.y, rc.y), boxes.all.min.z),
    new THREE.Vector3(out(boxes.all.max.x, rc.x), out(boxes.all.max.y, rc.y), boxes.all.max.z));

  let raf = 0, last = 0, alive = true;
  const watchers = new Set();
  const drawn = () => { for (const fn of watchers) fn(); };
  // The reveal: an ease from `from` to `to`, `delay` seconds after `start`
  // (when it was asked for), over `dur`. Timed by the clock, not by frames,
  // so a busy first frame (a model decoding) can't hold it back.
  const rv = { x: 0, from: 0, to: 0, start: 0, delay: 0, dur: 0 };
  view.setReveal(0);
  const stepReveal = () => {
    if (rv.x === rv.to) return false;
    const t = (performance.now() - rv.start) / 1000;
    const u = rv.dur > 0 ? Math.min(1, Math.max(0, (t - rv.delay) / rv.dur)) : 1;
    // Coming in it eases out (quick, then settling); going out it eases in
    // and out, so it doesn't vanish in the first moment.
    const k = rv.to > rv.from ? 1 - Math.pow(1 - u, 3) : u * u * (3 - 2 * u);
    rv.x = u >= 1 ? rv.to : rv.from + (rv.to - rv.from) * k;
    view.setReveal(rv.x);
    return rv.x !== rv.to;
  };
  // The zoom: eases (by the clock) to 1 when hovered, back to 0 after, by
  // closing the camera in on the rest pose's centre. The halo is drawn after,
  // at its own size, from the figure as it now is.
  const zm = { x: 0, from: 0, to: 0, start: 0 };
  let base = null; // the frame at no zoom
  const frameZoom = (x) => {
    if (!base) return;
    const z = 1 + ZOOM * x;
    view.frame = { cx: rc.x + (base.cx - rc.x) / z, cy: rc.y + (base.cy - rc.y) / z, h: base.h / z };
    view.project();
  };
  const stepZoom = () => {
    if (zm.x === zm.to) return false;
    const u = Math.min(1, (performance.now() - zm.start) / 1000 / 0.6);
    zm.x = u >= 1 ? zm.to : zm.from + (zm.to - zm.from) * (1 - Math.pow(1 - u, 3));
    frameZoom(zm.x);
    return zm.x !== zm.to;
  };
  const zoom = (on) => {
    const to = on ? 1 : 0;
    if (zm.to === to) return;
    Object.assign(zm, { from: zm.x, to, start: performance.now() });
    if (reducedMotion) zm.start = -1e9;
  };

  // Frames come at 20fps; between them the springs step in small steps.
  const FRAME = 1 / 20, SUB = 1 / 60;
  let acc = 0;
  const loop = (now) => {
    raf = 0;
    if (!alive) return;
    acc += Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;
    if (acc < FRAME) { raf = requestAnimationFrame(loop); return; }
    let moving = false;
    if (reducedMotion) { fig.jump(); fig.step(0); }
    else for (let n = Math.ceil(acc / SUB), i = 0; i < n; i++) moving = fig.step(acc / n);
    acc = 0;
    const growing = stepReveal(), zooming = stepZoom();
    view.draw();
    drawn();
    if (moving || growing || zooming) raf = requestAnimationFrame(loop);
  };
  // Woken, the first frame draws at once; then 20fps.
  const wake = () => { if (!raf && alive) { last = performance.now(); acc = FRAME; raf = requestAnimationFrame(loop); } };

  return {
    boxes,
    /** How big it's drawn against the others: its kind's config.scale, by eye. */
    optical: kind.config.scale ?? 1,
    /** The canvas box that fills a slot with the object at rest (see placeFigure), at its optical size. */
    place: (slot) => placeFigure(boxes, { ...slot, size: slot.size * (kind.config.scale ?? 1) }),
    /** Frames `span` with HALO px of room round it for the halo (the canvas is sized to include it). */
    layout() {
      const all = boxes.span, aw = all.max.x - all.min.x, ah = all.max.y - all.min.y;
      const s = Math.min((canvas.clientWidth - 2 * HALO) / aw, (canvas.clientHeight - 2 * HALO) / ah);
      const pad = HALO / s;
      view.frameTo(new THREE.Box3(new THREE.Vector3(all.min.x - pad, all.min.y - pad, all.min.z), new THREE.Vector3(all.max.x + pad, all.max.y + pad, all.max.z)));
      base = { ...view.frame };
      frameZoom(zm.x);
      fig.step(0); view.draw();
      drawn();
    },
    /** The figure's shape as it stands, at no zoom (for the growth to plant round). */
    silhouette: () => { fig.step(0); frameZoom(0); const m = view.silhouette(); frameZoom(zm.x); return m; },
    /** Gets the model onto the GPU now, so the first real draw is quick. */
    prime() { view.prime(); },
    hover(on) { fig.hover(on); zoom(on); wake(); },
    reveal(to, { duration = 0, delay = 0 } = {}) {
      if (reducedMotion) duration = delay = 0;
      Object.assign(rv, { from: rv.x, to, start: performance.now(), delay, dur: duration });
      wake();
    },
    point(px, py) { const r = fig.point(px, py); zoom(true); wake(); return r; },
    leave() { const r = fig.leave(); zoom(false); wake(); return r; },
    notes: (fig.notes ?? []).map(({ id, label, sub }) => ({ id, label, sub })),
    show(id) { const r = fig.show?.(id) ?? ""; zoom(true); wake(); return r; },
    anchors() {
      const w = canvas.clientWidth, h = canvas.clientHeight, v = new THREE.Vector3();
      return (fig.notes ?? []).map(({ id, obj, at }) => {
        obj.localToWorld(v.copy(at)).project(view.camera);
        return { id, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
      });
    },
    onFrame(fn) { watchers.add(fn); return () => watchers.delete(fn); },
    destroy() { alive = false; cancelAnimationFrame(raf); view.dispose(); },
  };
}

/**
 * Where to put a figure's canvas so its object at rest fills a slot: `slot`
 * is { cx, cy, size } in px (size: the rest pose's longer side). Returns the
 * canvas box { x, y, w, h } in px; it reaches past the slot wherever a pose
 * can, and by HALO more all round, for the halo.
 */
export function placeFigure(boxes, slot) {
  const { rest, span: all } = boxes;
  const s = slot.size / Math.max(rest.max.x - rest.min.x, rest.max.y - rest.min.y);
  const rcx = (rest.min.x + rest.max.x) / 2, rcy = (rest.min.y + rest.max.y) / 2;
  return {
    x: slot.cx - (rcx - all.min.x) * s - HALO,
    y: slot.cy - (all.max.y - rcy) * s - HALO,
    w: (all.max.x - all.min.x) * s + 2 * HALO,
    h: (all.max.y - all.min.y) * s + 2 * HALO,
    scale: s,
  };
}
