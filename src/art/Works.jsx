import React from "react";
import { resistFrom, opaqueBounds } from "./ink.js";
import { plot, seeded, setRandom } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const SPREAD = 6;       // px of bare paper kept around each silhouette
const LABEL_GAP = 14;   // px between a silhouette and its label
const LABEL_H = 16;
const CHAR_W = 7.1;     // the label's mono characters, 11px with tracking

/**
 * Works — the projects, surfaced in the paper. While the Works fold is open,
 * each project's cut-out render is laid on a layer over the (dimmed) field as
 * masking fluid, the way the frog is, and a patch of that project's own
 * growth comes up around it, so the object appears as a bare-paper
 * silhouette. Hovering or focusing one fills it in with the render itself;
 * clicking opens its sheet. Clicking the empty paper closes Works.
 *
 * Each patch is seeded by its project, so the same specimens come back every
 * time. On a resize they're redrawn complete for the new layout.
 */
export function Works({ projects, hovered, onHover, onClose, dimmed = false, leaving = false }) {
  const canvasRef = React.useRef(null);
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
    const lay = (now) => {
      const w = window.innerWidth, h = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const head = document.querySelector(".ov-head")?.getBoundingClientRect();
      const key = `${w}x${h}@${dpr}/${head ? Math.round(head.right) + "," + Math.round(head.bottom) : ""}`;
      if (key === laid) return;
      laid = key;
      growth.clear();
      layer.clearScratch();
      layer.size(w, h, dpr);

      const slots = arrange(openArea(w, h, head), imgs.length, isSmall);
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

      for (const s of placed) {
        const random = seeded(`${s.p.slug}/works`);
        const scale = Math.min(1, Math.max(0.55, s.box.h / 300));
        let gens;
        setRandom(random);
        try {
          gens = plot(growth.recorder, s.p.plant, s.box, scale, edgePoints(s.mask));
        } finally {
          setRandom(null);
        }
        growth.plant(gens, { random, now });
      }
      setSpots(placed.map(({ p, img, box, label, text }) => ({ slug: p.slug, title: p.title, hero: p.hero, img, box, label, text })));
    };

    // Start once the renders are in, and (on phones, where the specimens sit
    // under the header) once the fold has finished opening.
    let settle = 0;
    const relay = () => {
      clearTimeout(settle);
      settle = setTimeout(() => lay(true), 150);
    };
    const opening = new Promise((r) => setTimeout(r, isSmall ? 520 : 0));
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

  const px = (r) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });

  return (
    <div className={`works-layer${shown && !leaving ? " works-layer--shown" : ""}${dimmed ? " works-layer--dimmed" : ""}`}>
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
 * The open paper the specimens can use, in px: right of the header on wide
 * screens, below it on narrow ones, clear of the footer lines.
 */
function openArea(w, h, head) {
  const right = head ? head.right + 48 : 40;
  if (head && w - 40 - right >= 360) return { x0: right, y0: 40, x1: w - 40, y1: h - 80 };
  return { x0: 20, y0: (head ? head.bottom : 0) + 28, x1: w - 20, y1: h - 64 };
}

/**
 * Slots for n specimens in an area: the grid (3 across, 2, or 1) that lets
 * them be biggest, a little staggered so they don't sit on a ruled line.
 * Each slot is { cx, cy, size } for the object's longer side. On a phone they
 * fill more of their cell; on wider screens each patch needs room around it.
 */
function arrange(a, n, small) {
  const W = a.x1 - a.x0, H = a.y1 - a.y0;
  const room = LABEL_GAP + LABEL_H + 12;
  let best = null;
  for (const cols of [3, 2, 1]) {
    const rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    const size = Math.min(300, cw * (small ? 0.75 : 0.6), (ch - room) * 0.7);
    if (!best || size > best.size) best = { cols, rows, cw, ch, size };
  }
  const { cols, rows, cw, ch, size } = best;
  const stagger = [-0.07, 0.09, -0.02];
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i % cols + (cols - inRow) / 2; // centre a short last row
    out.push({
      cx: a.x0 + (c + 0.5) * cw,
      cy: a.y0 + (r + 0.5) * ch - room / 2 + (rows === 1 ? stagger[i % 3] * ch : 0),
      size,
    });
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
