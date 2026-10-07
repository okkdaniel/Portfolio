import React from "react";
import { resistFrom, opaqueBounds, eraseMark, wipeCells } from "./ink.js";
import { plot, vine, seeded, setRandom } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { createFigure } from "../figures/load.js";

const SPREAD = 6;       // px of bare paper kept around each silhouette
const LABEL_GAP = 14;   // px between a silhouette and its label
const LABEL_H = 16;
const CHAR_W = 7.1;     // the label's mono characters, 11px with tracking
const FOLD_MS = 520;    // the Works fold's opening animation, plus a little
// Each visit lays the specimens out (and grows them) its own way; within a
// visit they come back the same.
const VISIT = Math.random().toString(36).slice(2);

/**
 * Works — the projects, surfaced in the paper. While the Works fold is open
 * (and the field has been taken back to bare paper), each project's figure —
 * its object drawn as lines from its CAD (src/figures) — stands on the paper,
 * and its silhouette at rest is laid down as masking fluid, the way the frog
 * is, so a patch of that project's own growth comes up around it and leaves
 * it bare. Vines run from one to the next, opening small plants as they go,
 * so the three grow as one piece. Hovering or focusing one sets its figure
 * moving; clicking opens its sheet. Clicking the empty paper closes Works,
 * and `leaving` un-grows it all, newest first.
 *
 * On wide screens they're laid out as in Daniel's sketch (see SKETCH); on
 * narrow ones under the header. On a resize they're redrawn complete for the
 * new layout.
 */
export function Works({ projects, hovered, onHover, onClose, dimmed = false, leaving = false }) {
  const canvasRef = React.useRef(null);
  const figsRef = React.useRef(null);
  const figures = React.useRef({});
  const retractRef = React.useRef(() => {});
  const [spots, setSpots] = React.useState([]);
  const [shown, setShown] = React.useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");

  React.useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const layer = inkLayer(canvas, isSmall ? 2.2 : 3);
    const { ink } = layer;
    ink.feather = 44;
    ink.wobble = 22;
    const growth = createGrowth(layer, { reducedMotion });
    // One canvas per figure, in their own layer above the growth.
    const canvases = projects.map(() => {
      const c = document.createElement("canvas");
      c.className = "works-layer__fig";
      c.setAttribute("aria-hidden", "true");
      figsRef.current.append(c);
      return c;
    });
    let figs = [];
    let alive = true;
    let laid = "";

    // Lay the specimens out for the window as it is. `now` draws them
    // complete instead of growing them.
    let leavingNow = false;
    const lay = (now) => {
      if (leavingNow) return;
      const w = window.innerWidth, h = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const head = document.querySelector(".ov-head")?.getBoundingClientRect();
      // Only a change to the window (or, on narrow screens, to the header
      // they sit under) lays them out again.
      const key = `${w}x${h}@${dpr}${isWide(w, h, isSmall) || !head ? "" : "/" + Math.round(head.bottom)}`;
      if (key === laid) return;
      laid = key;
      growth.clear();
      layer.clearScratch();
      layer.size(w, h, dpr);

      const slots = scatter(w, h, head, projects.length, isSmall);
      const placed = projects.map((p, i) => {
        const slot = slots[i], fig = figs[i], c = canvases[i];
        if (!fig) return null;
        // The canvas is laid so the object at rest fills the slot; it reaches
        // past it wherever a pose can. Its silhouette at rest is the mask.
        const at = fig.place(slot);
        Object.assign(c.style, { left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px` });
        fig.layout();
        const mask = resistFrom(fig.silhouette(), Math.round(at.x), Math.round(at.y), Math.round(at.w), Math.round(at.h), SPREAD);
        const box = opaqueBounds(mask, SPREAD) ?? { x: slot.cx - slot.size / 2, y: slot.cy - slot.size / 2, w: slot.size, h: slot.size };
        // On phones the list right above carries the titles; the specimens
        // just take their numbers.
        const n = String(p.index).padStart(2, "0");
        const text = isSmall ? n : `${n}  ${p.title}`;
        const lw = text.length * CHAR_W;
        const lx = Math.max(8, Math.min(w - 8 - lw, box.x + box.w / 2 - lw / 2));
        const label = { x: lx, y: box.y + box.h + LABEL_GAP, w: lw, h: LABEL_H };
        return { p, mask, box, label, text };
      }).filter(Boolean);

      const pad = (r, n) => ({ x: r.x - n, y: r.y - n, w: r.w + 2 * n, h: r.h + 2 * n });
      const F = 1e4;
      ink.keepouts = [
        ...[...document.querySelectorAll("[data-keepout]")].map((el) => pad(el.getBoundingClientRect(), 6)),
        ...placed.map((s) => pad(s.label, 6)),
        { x: -F, y: -F, w: 3 * F, h: F },
        { x: -F, y: h, w: 3 * F, h: F },
        { x: -F, y: -F, w: F, h: 3 * F },
        { x: w, y: -F, w: F, h: 3 * F },
      ];
      // No masking fluid: the growth comes in under the figures too. Each
      // figure clears its own space with its halo, wherever it moves, so
      // turning or rising never leaves a bare hole or a hard edge. The
      // silhouettes at rest still shape the growth (plot traces their edges).
      ink.resist = null;

      // Slower and more evenly paced than the field's growth, so the
      // specimens come up steadily rather than mostly in the first moment.
      const tempo = { now, pace: 1.6, ease: 2 };
      const edges = placed.map((s) => edgePoints(s.mask));
      placed.forEach((s, i) => {
        const random = seeded(`${s.p.slug}/${VISIT}`);
        const scale = Math.min(1, Math.max(0.55, s.box.h / 300));
        let gens;
        setRandom(random);
        try {
          gens = plot(growth.recorder, s.p.plant, s.box, scale, edges[i], { w, h });
        } finally {
          setRandom(null);
        }
        growth.plant(gens, { random, ...tempo });
      });

      // Vines joining them: each to its nearest neighbour not yet joined,
      // so they make one chain.
      const random = seeded(`vines/${VISIT}`);
      const vines = [];
      setRandom(random);
      try {
        for (const [i, j] of chain(placed.map((s) => s.box))) {
          const path = between(edges[i], edges[j], random);
          if (path.length > 8) vines.push({ it: vine(growth.recorder, path, Math.min(0.8, Math.max(0.5, placed[i].box.h / 360)), { flowers: 0.08 }), speed: 3 });
        }
      } finally {
        setRandom(null);
      }
      growth.plant(vines, { random, ...tempo });
      // The figures grow in with their growth, a beat after it starts (at
      // once when re-laid for a resize).
      placed.forEach((s) => figs[projects.indexOf(s.p)]?.reveal(1, now ? {} : { delay: 0.6, duration: 2.6 }));
      setSpots(placed.map(({ p, box, label, text }) => ({ slug: p.slug, title: p.title, box, label, text })));
    };

    // Take it all back off, newest first (as Works closes).
    retractRef.current = () => {
      leavingNow = true;
      figs.forEach((f) => f?.reveal(0, { duration: 0.7 }));
      growth.retract({
        duration: reducedMotion ? 0 : 0.85,
        size: { w: window.innerWidth, h: window.innerHeight },
        erase: (m, alpha) => eraseMark(layer.ctx, m, ink.pitch, null, alpha),
        wipe: (xy, from, to, alpha) => wipeCells(layer.ctx, xy, from, to, ink.pitch, null, alpha),
        onDone: () => { layer.clearScratch(); layer.size(1, 1, 1); },
      });
    };

    // Start as soon as the figures are in (they start loading when the Works
    // fold is reached for), together with the field going back to paper. On
    // narrow screens, where they sit under the header, wait for the fold to
    // finish opening first.
    let settle = 0;
    const relay = () => {
      clearTimeout(settle);
      settle = setTimeout(() => lay(true), 150);
    };
    const opening = new Promise((r) => setTimeout(r, isWide(window.innerWidth, window.innerHeight, isSmall) ? 0 : FOLD_MS));
    let watcher = null;
    const loading = Promise.all(projects.map((p, i) => createFigure(p.slug, canvases[i], { reducedMotion }).catch(() => null)));
    Promise.all([loading, opening]).then(([made]) => {
      figs = made;
      if (!alive) { made.forEach((f) => f?.destroy()); return; }
      figures.current = Object.fromEntries(projects.map((p, i) => [p.slug, made[i]]));
      lay(reducedMotion);
      watcher = new ResizeObserver(relay);
      const head = document.querySelector(".ov-head");
      if (head) watcher.observe(head);
    });
    window.addEventListener("resize", relay);

    return () => {
      alive = false;
      clearTimeout(settle);
      watcher?.disconnect();
      window.removeEventListener("resize", relay);
      growth.clear();
      figs.forEach((f) => f?.destroy());
      figures.current = {};
      canvases.forEach((c) => c.remove());
    };
  }, [projects, reducedMotion, isSmall]);

  // The figure hovered in the fold's list (or focused) moves on its own; one
  // under the mouse follows the mouse instead (below). The rest settle.
  const underMouse = React.useRef(null);
  React.useEffect(() => {
    for (const [slug, f] of Object.entries(figures.current)) if (slug !== underMouse.current) f?.hover(slug === hovered && !leaving);
  }, [hovered, leaving, spots]);

  React.useEffect(() => {
    if (leaving) retractRef.current();
  }, [leaving]);

  const px = (r) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });

  // The pointer drives a figure, as on its sheet (up and down runs the
  // robot, across turns a part): a mouse just by moving over it; touch, which
  // has no hover, by dragging on it, so a tap still opens the project. Let
  // go, it settles back.
  const drag = React.useRef(null);
  const touch = {
    onPointerDown: (e) => {
      if (e.pointerType === "mouse") return;
      drag.current = { x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (e.pointerType !== "mouse") {
        if (!d) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true;
        if (!d.moved) return;
      }
      const slug = e.currentTarget.dataset.slug, r = e.currentTarget.getBoundingClientRect();
      const clamp = (v) => Math.min(1, Math.max(0, v));
      figures.current[slug]?.point(clamp((e.clientX - r.left) / r.width), clamp((r.bottom - e.clientY) / r.height));
    },
    onPointerUp: (e) => {
      const d = drag.current;
      if (!d) return;
      if (d.moved) figures.current[e.currentTarget.dataset.slug]?.leave();
      // A drag isn't a tap: keep it from opening the project.
      drag.current = d.moved ? { cancelClick: true } : null;
    },
    onClick: (e) => {
      if (drag.current?.cancelClick) { e.preventDefault(); drag.current = null; }
    },
  };

  return (
    <div className={`works-layer${shown && !leaving ? " works-layer--shown" : ""}${leaving ? " works-layer--leaving" : ""}${dimmed ? " works-layer--dimmed" : ""}`}>
      <div className="works-layer__backdrop" onClick={onClose} aria-hidden="true" />
      <canvas ref={canvasRef} className="works-layer__ink" aria-hidden="true" />
      <div ref={figsRef} className="works-layer__figs" />
      {spots.map((s) => (
        <React.Fragment key={s.slug}>
          <a
            className={`works-layer__spot${hovered === s.slug ? " is-hot" : ""}`}
            href={`#work/${s.slug}`}
            style={px({ x: Math.min(s.box.x, s.label.x), y: s.box.y, w: Math.max(s.box.w, s.label.w), h: s.label.y + s.label.h - s.box.y })}
            data-slug={s.slug}
            {...touch}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") { underMouse.current = s.slug; touch.onPointerMove(e); onHover(s.slug); } }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") { underMouse.current = null; figures.current[s.slug]?.leave(); }
              onHover(null);
            }}
            onFocus={() => onHover(s.slug)}
            onBlur={() => onHover(null)}
          >
            <span
              className="works-layer__label"
              style={{ left: `${s.label.x - Math.min(s.box.x, s.label.x)}px`, top: `${s.label.y - s.box.y}px`, width: `${s.label.w}px` }}
            >
              {s.text}
            </span>
          </a>
        </React.Fragment>
      ))}
    </div>
  );
}

// On wide screens, Daniel's layout (from his sketch): left low, middle high
// just right of the header, right a little lower and the biggest, each about
// a quarter of the window across, vines running left to middle to right.
// As [x, y, size]: centres as fractions of the window, size (the object's
// longer side) as a fraction of its width.
const SKETCH = [
  [0.207, 0.712, 0.257],
  [0.539, 0.284, 0.256],
  [0.824, 0.617, 0.278],
];
// On narrow ones, under the header: one of these, picked by chance.
const TALL = [
  [[0.28, 0.18], [0.72, 0.5], [0.3, 0.83]],
  [[0.7, 0.17], [0.3, 0.5], [0.68, 0.84]],
];

/** Whether the window lays the specimens out as in the sketch. */
const isWide = (w, h, small) => !small && w > h * 1.1;

/**
 * Where n specimens go, in order (01, 02, 03 left to right on wide screens).
 * Wide: the sketch, scaled to the window (sizes capped so they fit its
 * height). Narrow: the paper under the header, one of the TALL sets, sizes
 * varied a little. Slots are { cx, cy, size }, size being the object's
 * longer side.
 */
function scatter(w, h, head, n, small) {
  if (isWide(w, h, small) && n === 3) {
    return SKETCH.map(([fx, fy, fs]) => ({ cx: w * fx, cy: h * fy, size: Math.min(380, w * fs, h * 0.36) }));
  }
  const random = seeded(`works-layout/${VISIT}`);
  const room = LABEL_GAP + LABEL_H + 12;
  const m = small ? 18 : 44;
  const area = { x0: m, y0: head ? head.bottom + 24 : m, x1: w - m, y1: h - (small ? 60 : 80) };
  const W = area.x1 - area.x0, H = area.y1 - area.y0;
  const set = n === 3
    ? TALL[Math.floor(random() * TALL.length)]
    : Array.from({ length: n }, (_, i) => [(i + 0.5) / n, i % 2 ? 0.3 : 0.7]);
  const base = Math.min(240, W * 0.55, H * 0.24);
  return Array.from({ length: n }, (_, i) => {
    const [fx, fy] = set[i];
    const size = base * (0.85 + random() * 0.3);
    const cx = Math.min(area.x1 - size / 2, Math.max(area.x0 + size / 2, area.x0 + W * fx));
    const cy = Math.min(area.y1 - size / 2 - room, Math.max(area.y0 + size / 2, area.y0 + H * fy));
    return { cx, cy, size };
  });
}

/** Pairs [i, j] joining boxes into one chain, each to its nearest unjoined. */
function chain(boxes) {
  const c = boxes.map((b) => [b.x + b.w / 2, b.y + b.h / 2]);
  const left = c.map((_, i) => i);
  left.sort((p, q) => c[p][0] - c[q][0]);
  let at = left.shift();
  const pairs = [];
  while (left.length) {
    const d = (i) => Math.hypot(c[i][0] - c[at][0], c[i][1] - c[at][1]);
    left.sort((p, q) => d(p) - d(q));
    const next = left.shift();
    pairs.push([at, next]);
    at = next;
  }
  return pairs;
}

/**
 * A vine's path from one silhouette's edge to another's: between the two
 * nearest edge points, bowed to one side and wavering, a few px a step.
 */
function between(ea, eb, random) {
  if (!ea.length || !eb.length) return [];
  const mid = (pts) => pts.reduce((m, p) => [m[0] + p.x / pts.length, m[1] + p.y / pts.length], [0, 0]);
  const [bx, by] = mid(eb), [ax, ay] = mid(ea);
  const near = (pts, x, y) => pts.reduce((b, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(b.x - x, b.y - y) ? p : b));
  const a = near(ea, bx, by), b = near(eb, ax, ay);
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (L < 1) return [];
  const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
  const bow = (random() - 0.5) * 0.7 * L;
  const wob = 5 + random() * 8, f = 2 + random() * 3, ph = random() * Math.PI * 2;
  const side = random() < 0.5 ? 1 : -1;
  const cx = (a.x + b.x) / 2 + nx * bow, cy = (a.y + b.y) / 2 + ny * bow;
  const out = [];
  const steps = Math.max(2, Math.round(L / 3));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, u = 1 - t;
    const wv = Math.sin(t * f * Math.PI + ph) * wob * Math.sin(Math.PI * t);
    const x = u * u * a.x + 2 * u * t * cx + t * t * b.x + nx * wv;
    const y = u * u * a.y + 2 * u * t * cy + t * t * b.y + ny * wv;
    out.push({ x, y, out: Math.atan2(ny * side, nx * side) });
  }
  return out;
}

/** Points along the edge of a mask (page px), every few px. */
function edgePoints(m, step = 3) {
  const out = [];
  const on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.a[y * m.w + x] > 127;
  for (let y = 0; y < m.h; y += step) {
    for (let x = 0; x < m.w; x += step) {
      if (on(x, y) && (!on(x - step, y) || !on(x + step, y) || !on(x, y - step) || !on(x, y + step))) {
        out.push({ x: m.x + x, y: m.y + y });
      }
    }
  }
  return out;
}
