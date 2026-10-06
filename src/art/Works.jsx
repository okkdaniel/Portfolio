import React from "react";
import { resistFrom, opaqueBounds, eraseMark } from "./ink.js";
import { plot, vine, seeded, setRandom } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

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
 * (and the field has been taken back to bare paper), each project's cut-out
 * render is laid on a layer over the paper as masking fluid, the way the frog
 * is, and a patch of that project's own growth comes up around it, so the
 * object appears as a bare-paper silhouette. Vines run from one to the next,
 * opening small plants as they go, so the three grow as one piece. Hovering
 * or focusing a silhouette fills it in with the render itself; clicking opens
 * its sheet. Clicking the empty paper closes Works, and `leaving` un-grows it
 * all, newest first.
 *
 * The specimens are scattered over the whole open paper, sized and placed
 * differently each visit (the same within one). On a resize they're redrawn
 * complete for the new layout.
 */
export function Works({ projects, hovered, onHover, onClose, dimmed = false, leaving = false }) {
  const canvasRef = React.useRef(null);
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
    const imgs = projects.map((p) => {
      const i = new Image();
      i.src = p.hero;
      return i;
    });
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
      // Only a change to the window or the header's footprint lays them out
      // again (and the first layout waits for the fold to finish opening, so
      // that doesn't cut the growth short).
      const key = `${w}x${h}@${dpr}/${head ? [head.right, head.bottom].map(Math.round).join(",") : ""}`;
      if (key === laid) return;
      laid = key;
      growth.clear();
      layer.clearScratch();
      layer.size(w, h, dpr);

      const slots = scatter(w, h, head, imgs.length, isSmall);
      const placed = imgs.map((img, i) => {
        const p = projects[i];
        const slot = slots[i];
        const nat = naturalBounds(img);
        // Fit the object itself (not its transparent margins) to the slot.
        const k = slot.size / Math.max(nat.w, nat.h);
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        const ix = slot.cx - (nat.x + nat.w / 2) * k, iy = slot.cy - (nat.y + nat.h / 2) * k;
        const mask = resistFrom(img, Math.round(ix), Math.round(iy), Math.round(iw), Math.round(ih), SPREAD);
        const box = opaqueBounds(mask, SPREAD) ?? { x: ix, y: iy, w: iw, h: ih };
        // On phones the list right above carries the titles; the specimens
        // just take their numbers.
        const n = String(p.index).padStart(2, "0");
        const text = isSmall ? n : `${n}  ${p.title}`;
        const lw = text.length * CHAR_W;
        const lx = Math.max(8, Math.min(w - 8 - lw, box.x + box.w / 2 - lw / 2));
        const label = { x: lx, y: box.y + box.h + LABEL_GAP, w: lw, h: LABEL_H };
        return { p, img: { x: ix, y: iy, w: iw, h: ih }, mask, box, label, text };
      });

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
      ink.resist = placed.map((s) => s.mask);

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
          gens = plot(growth.recorder, s.p.plant, s.box, scale, edges[i]);
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
      setSpots(placed.map(({ p, img, box, label, text }) => ({ slug: p.slug, title: p.title, hero: p.hero, img, box, label, text })));
    };

    // Take it all back off, newest first (as Works closes).
    retractRef.current = () => {
      leavingNow = true;
      growth.retract({
        duration: reducedMotion ? 0 : 0.9,
        erase: (m) => eraseMark(layer.ctx, m, ink.pitch, null),
        onDone: () => { layer.clearScratch(); layer.size(1, 1, 1); },
      });
    };

    // Start once the renders are in and the fold has finished opening (the
    // specimens avoid the header, which grows as it opens).
    let settle = 0;
    const relay = () => {
      clearTimeout(settle);
      settle = setTimeout(() => lay(true), 150);
    };
    const opening = new Promise((r) => setTimeout(r, FOLD_MS));
    let watcher = null;
    Promise.all([...imgs.map((i) => i.decode().catch(() => {})), opening]).then(() => {
      if (!alive) return;
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
    };
  }, [projects, reducedMotion, isSmall]);

  React.useEffect(() => {
    if (leaving) retractRef.current();
  }, [leaving]);

  const px = (r) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });

  return (
    <div className={`works-layer${shown && !leaving ? " works-layer--shown" : ""}${leaving ? " works-layer--leaving" : ""}${dimmed ? " works-layer--dimmed" : ""}`}>
      <div className="works-layer__backdrop" onClick={onClose} aria-hidden="true" />
      <canvas ref={canvasRef} className="works-layer__ink" aria-hidden="true" />
      {spots.map((s) => (
        <React.Fragment key={s.slug}>
          <img
            className={`works-layer__render${hovered === s.slug ? " is-hot" : ""}`}
            src={s.hero}
            alt=""
            aria-hidden="true"
            style={px(s.img)}
          />
          <a
            className={`works-layer__spot${hovered === s.slug ? " is-hot" : ""}`}
            href={`#work/${s.slug}`}
            style={px({ x: Math.min(s.box.x, s.label.x), y: s.box.y, w: Math.max(s.box.w, s.label.w), h: s.label.y + s.label.h - s.box.y })}
            onPointerEnter={() => onHover(s.slug)}
            onPointerLeave={() => onHover(null)}
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

/**
 * Where n specimens go: scattered over the whole open paper (the window, less
 * a margin, the footer lines, and the header with room around it), each a
 * different size, loosely apart. Best-candidate placement with a good share
 * of chance in the score, biggest first, on this visit's seed, so it's never
 * a grid and never the same two visits running. Slots are { cx, cy, size },
 * size being the object's longer side.
 */
function scatter(w, h, head, n, small) {
  const random = seeded(`works-layout/${VISIT}/${Math.round(w)}x${Math.round(h)}`);
  const m = small ? 18 : 40;
  const x0 = m, y0 = m, x1 = w - m, y1 = h - (small ? 60 : 80);
  const block = head ? { x: head.left - 30, y: head.top - 30, w: head.width + 60, h: head.height + 40 } : null;
  const free = (x1 - x0) * (y1 - y0) - (block ? block.w * block.h : 0);
  const base = Math.min(small ? 170 : 300, Math.sqrt(Math.max(1, free) / n) * (small ? 0.55 : 0.45));
  const room = LABEL_GAP + LABEL_H + 12;
  const sizes = Array.from({ length: n }, () => base * (0.72 + random() * 0.5));
  const order = sizes.map((size, i) => i).sort((p, q) => sizes[q] - sizes[p]);
  const hits = (cx, cy, size) => block
    && cx + size / 2 + 12 > block.x && cx - size / 2 - 12 < block.x + block.w
    && cy + size / 2 + room > block.y && cy - size / 2 - 12 < block.y + block.h;
  const out = new Array(n);
  const placed = [];
  for (const i of order) {
    const size = sizes[i];
    const r = size * 0.6; // room for the patch around it
    // Never on the header, unless there's truly nowhere else.
    let best = null, fallback = null;
    for (let k = 0; k < 200; k++) {
      const cx = x0 + size / 2 + random() * Math.max(0, x1 - x0 - size);
      const cy = y0 + size / 2 + random() * Math.max(0, y1 - y0 - size - room);
      let gap = Infinity;
      for (const q of placed) gap = Math.min(gap, Math.hypot(cx - q.cx, cy - q.cy) - r - q.r);
      // Apart enough is enough; past that, chance decides.
      const score = Math.min(gap, size * 0.5) + random() * size * 0.6;
      const c = { cx, cy, r, score };
      if (hits(cx, cy, size)) { if (!fallback || score > fallback.score) fallback = c; continue; }
      if (!best || score > best.score) best = c;
    }
    best ??= fallback;
    placed.push(best);
    out[i] = { cx: best.cx, cy: best.cy, size };
  }
  return out;
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

const boundsCache = new WeakMap();

/** The opaque part of an image, in its natural px (from a small probe). */
function naturalBounds(img) {
  if (boundsCache.has(img)) return boundsCache.get(img);
  const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const probe = document.createElement("canvas");
  probe.width = w;
  probe.height = h;
  const pc = probe.getContext("2d", { willReadFrequently: true });
  pc.drawImage(img, 0, 0, w, h);
  const a = pc.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a[(y * w + x) * 4 + 3] <= 127) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  const b = x1 < 0
    ? { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }
    : { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
  boundsCache.set(img, b);
  return b;
}
