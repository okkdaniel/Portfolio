import React from "react";
import { C, PAPER, FEATHER, WOBBLE, resistFrom, eraseMark, wipeCells } from "./ink.js";
import { grow, clearing, seeded, setRandom, SPORE_COLORS } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const FROG_SRC = "/assets/brand/anura.svg";

// A planting younger than this (ms) may still be growing: redrawn after a
// resize, it grows again rather than appearing complete.
const GROWING = 9000;

/**
 * Field — the paper everything grows on. A click sets off a growth: a bloom of
 * some plant at the spot, runners creeping outward that open more plants as
 * they go, and a scatter of spores. Moving the mouse leaves a faint trail of
 * spores.
 *
 * The canvas is never cleared while you're on it. Each mark is drawn exactly
 * once, when the growth reaches it, so the field only accumulates and a frame
 * costs the same however full it gets. The loop sleeps when nothing is
 * growing (see growth.js for how growth is paced).
 *
 * The field also remembers what grew rather than only the pixels: every
 * planting (the frog's clearing, each click) as a position relative to the
 * window and a random seed, and the spore trail likewise. When the window
 * changes size, the canvas follows it live, kept at full resolution, with
 * the painting carried along so the frog holds its place in the layout; once
 * the resizing settles (a full redraw is too much to do every frame), it
 * redraws all of it for the new size: the frog placed for the new layout,
 * every plant in the same shape at the same relative spot. Small height-only
 * changes, like a phone's toolbar, keep the painting as it is.
 *
 * Anything marked data-keepout (the text) is kept clear of new ink. Ink that
 * grew before the text got there (a fold opening over it) is hidden by the
 * veil: a second canvas of paper laid over the field, solid under the text
 * and dithered away across the same soft, wandering edge that new ink thins
 * out along. The veil follows the text as folds open and close, and never
 * erases anything, so closing a fold brings the plants back.
 *
 * Hidden on the paper is the anura frog in masking fluid: ink never lands on
 * it, and the page opens by growing a clearing over it, so the frog appears
 * as the bare paper the paint couldn't reach.
 *
 * The whole field can also be taken back: retract() un-grows it, newest
 * marks first, down to bare paper (Works does this as it opens, so the
 * projects come up on clean paper); regrow() grows everything back.
 *
 * Reduced motion: each growth is drawn complete, instantly.
 *
 * Ref: { reset } clears the paper; { retract, regrow } as above.
 */
export const Field = React.forwardRef(function Field({ dimmed = false }, ref) {
  const canvasRef = React.useRef(null);
  const veilRef = React.useRef(null);
  const api = React.useRef({ reset() {} });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");
  // What has grown, kept outside the effect, which runs again when the
  // screen crosses the phone breakpoint, so that can redraw it too.
  const memory = React.useRef({ plantings: [], trail: [], salt: Math.random().toString(36).slice(2), n: 0, retracted: false });

  React.useImperativeHandle(ref, () => ({
    reset: () => api.current.reset(),
    retract: () => api.current.retract?.(),
    regrow: () => api.current.regrow?.(),
  }), []);

  React.useEffect(() => {
    const mem = memory.current;
    const canvas = canvasRef.current;
    const veil = veilRef.current;
    const vctx = veil.getContext("2d");
    const layer = inkLayer(canvas, isSmall ? 2.2 : 3);
    const { ctx, ink } = layer;
    const growth = createGrowth(layer, { reducedMotion });
    const recorder = growth.recorder;
    let w = 0, h = 0, dpr = 1;

    const paper = () => layer.paper(PAPER);

    // Size both canvases to the window. This wipes them.
    const sizeTo = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      layer.size(w, h, dpr);
      veil.width = canvas.width;
      veil.height = canvas.height;
    };

    // Resize but keep the painting where it is, for small height-only changes.
    const carry = () => {
      const keep = document.createElement("canvas");
      keep.width = canvas.width;
      keep.height = canvas.height;
      keep.getContext("2d").drawImage(canvas, 0, 0);
      sizeTo();
      paper();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(keep, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Same per-cell odds every redraw, so the veil's edge holds still while a
    // fold animates instead of shimmering.
    const cellHash = (gx, gy) => {
      const v = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };

    // Paper over the text, dithered away along the same edge new ink fades on:
    // a cell is covered with probability (1 - fade), just as new ink skips it.
    const drawVeil = () => {
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.clearRect(0, 0, veil.width, veil.height);
      vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      vctx.fillStyle = PAPER;
      const P = ink.pitch;
      const M = FEATHER + WOBBLE;
      // One path for the whole veil, filled once (as with washes).
      vctx.beginPath();
      for (const r of ink.keepouts) {
        vctx.rect(r.x, r.y, r.w, r.h);
        const gx0 = Math.floor((r.x - M) / P), gx1 = Math.ceil((r.x + r.w + M) / P);
        const gy0 = Math.floor((r.y - M) / P), gy1 = Math.ceil((r.y + r.h + M) / P);
        for (let gy = gy0; gy <= gy1; gy++) {
          const py = gy * P;
          for (let gx = gx0; gx <= gx1; gx++) {
            const px = gx * P;
            if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) continue;
            if (cellHash(gx, gy) < ink.keepoutFade(px, py)) continue;
            vctx.rect(px - P / 2 - 0.3, py - P / 2 - 0.3, P + 0.6, P + 0.6);
          }
        }
      }
      vctx.fill();
    };

    let keepoutKey = "";
    const applyKeepouts = () => {
      ink.keepouts = [...document.querySelectorAll("[data-keepout]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 };
      });
      // Redraw the veil only when the text's footprint actually moved.
      const key = ink.keepouts.map((r) => [r.x, r.y, r.w, r.h].map(Math.round).join(",")).join("|") + "@" + dpr + "@" + veil.width;
      if (key === keepoutKey) return;
      keepoutKey = key;
      drawVeil();
    };

    const scale = () => Math.min(1.4, Math.max(0.85, Math.min(w, h) / 700));

    // ---- the frog ----
    // Masking fluid in the shape of the anura frog, laid on the paper before
    // anything grows (see Ink.resist). The page opens by planting a clearing
    // over it, so the frog surfaces as bare paper in the middle of the
    // growth. It's placed for the window's size, and placed again (with its
    // clearing redrawn around it) when that changes; clearing the paper
    // leaves it be.
    const frog = new Image();
    frog.src = FROG_SRC;
    let frogBox = null;
    // Where the frog sits for a window of w × h.
    const frogAt = (w, h) => (isSmall ? [w * 0.5, h * 0.66] : [w * 0.66, h * 0.56]);
    const placeFrog = () => {
      const size = isSmall ? w * 0.62 : Math.min(w * 0.26, h * 0.48);
      const k = size / Math.max(frog.width, frog.height);
      const fw = Math.round(frog.width * k), fh = Math.round(frog.height * k);
      const [cx, cy] = frogAt(w, h);
      ink.resist = resistFrom(frog, Math.round(cx - fw / 2), Math.round(cy - fh / 2), fw, fh);
      frogBox = { x: cx - fw * 0.65, y: cy - fh * 0.65, w: fw * 1.3, h: fh * 1.3 };
    };

    // ---- plantings ----
    // Each is { kind: "clearing" } (over the frog) or { kind: "grow", fx, fy,
    // k } (a click, at a fraction of the window, k its size against scale()),
    // plus a seed: everything about how it grows comes from that, so it can
    // be drawn again, the same, at any size.
    const plantOne = (p, now) => {
      if (p.kind === "clearing" && !frogBox) return;
      const random = seeded(p.seed);
      let gens;
      setRandom(random);
      try {
        gens = p.kind === "clearing"
          ? clearing(recorder, frogBox, scale(), { w, h })
          : grow(recorder, p.fx * w, p.fy * h, scale() * p.k, { w, h });
      } finally {
        setRandom(null);
      }
      growth.plant(gens, { random, now });
    };
    const add = (p) => {
      p.seed = `${mem.salt}-${mem.n++}`;
      p.at = performance.now();
      mem.plantings.push(p);
      if (!mem.retracted) plantOne(p, reducedMotion); // else it grows with regrow()
    };
    const growAt = (x, y) => add({ kind: "grow", fx: x / w, fy: y / h, k: 0.75 + Math.random() * 0.5 });

    // Everything that's grown, again, for the window as it is now. Older
    // plantings are drawn complete; recent ones grow again from the start.
    // (The complete ones go first: drawing at once also finishes anything
    // already queued.)
    const redraw = () => {
      growth.clear();
      layer.clearScratch();
      sizeTo();
      paper();
      if (frog.complete && frog.naturalWidth) placeFrog();
      keepoutKey = "";
      applyKeepouts();
      if (mem.retracted) return; // taken back: stays bare until regrow()
      const t = performance.now();
      const done = (p) => reducedMotion || t - p.at > GROWING;
      for (const p of mem.plantings) if (done(p)) plantOne(p, true);
      redrawTrail();
      for (const p of mem.plantings) if (!done(p)) plantOne(p, false);
    };

    const redrawTrail = () => {
      for (const d of mem.trail) {
        const a = [d.fx * w, d.fy * h, d.r, d.col, 0.55];
        ink.seed(...a);
        growth.note("seed", a);
      }
      layer.flush();
    };

    // Un-grow everything, newest first, to bare paper.
    api.current.retract = () => {
      if (mem.retracted) return;
      mem.retracted = true;
      growth.retract({
        duration: reducedMotion ? 0 : 1,
        size: { w, h },
        erase: (m) => eraseMark(ctx, m, ink.pitch, PAPER),
        wipe: (xy, from, to) => wipeCells(ctx, xy, from, to, ink.pitch, PAPER),
        onDone: () => { layer.clearScratch(); paper(); },
      });
    };

    // Grow everything back, from the start.
    api.current.regrow = () => {
      if (!mem.retracted) return;
      mem.retracted = false;
      growth.clear();
      layer.clearScratch();
      paper();
      for (const p of mem.plantings) plantOne(p, reducedMotion);
      redrawTrail();
    };

    api.current.reset = () => {
      growth.clear();
      layer.clearScratch();
      paper();
      mem.plantings = [];
      mem.trail = [];
      mem.retracted = false;
    };

    sizeTo();
    paper();

    // Warm the GPU up before anything is visible. The first time a kind of
    // draw is used (halftone path, small and large seeds, the multiply
    // composite) the graphics driver compiles a shader for it, which stalled
    // the first frames of growth by 60–150ms. Doing one of each now, then
    // laying fresh paper over it, moves that cost into page load.
    // The marks go in the top-left corner, which always sits under the
    // header's paper veil, so they're never seen. They have to really be
    // drawn (paper laid straight over them would let the browser skip them),
    // so the corner is cleaned a couple of frames later instead.
    ink.wash(60, 60, 14, C.moss, 0.4, 1);
    ink.wash(120, 80, 50, C.lichen, 0.2, 0.5);
    ink.wash(150, 130, 110, C.glacier, 0.25, 0.75);
    ink.seed(60, 110, 1.2, C.rust, 0.8);
    ink.seed(80, 110, 4.5, C.sun, 0.8);
    layer.flush();
    let warmRaf = requestAnimationFrame(() => {
      warmRaf = requestAnimationFrame(() => {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, 270, 250);
        ctx.restore();
      });
    });

    applyKeepouts();
    // Folds change the text's footprint; follow it every frame they animate.
    const watcher = new ResizeObserver(applyKeepouts);
    document.querySelectorAll("[data-keepout]").forEach((el) => watcher.observe(el));

    // A little grows as you arrive: the clearing that turns up the frog, and
    // on wider screens one more patch off in the corner. If things have grown
    // already (this runs again when the screen crosses the phone breakpoint),
    // they're redrawn for the new layout instead.
    let alive = true;
    const seedTimers = [];
    frog
      .decode()
      .then(() => {
        if (!alive) return;
        placeFrog();
        if (mem.plantings.length) return redraw();
        seedTimers.push(setTimeout(() => add({ kind: "clearing" }), reducedMotion ? 0 : 300));
        if (!isSmall) seedTimers.push(setTimeout(() => growAt(w * 0.9, h * 0.18), reducedMotion ? 0 : 2200));
      })
      .catch(() => {});

    // ---- input ----
    let downX = 0, downY = 0, downAt = 0;
    let lastX = null, lastY = null, travel = 0;
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; downAt = performance.now(); };
    const onUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10 || performance.now() - downAt > 700) return;
      growAt(e.clientX, e.clientY);
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      if (lastX !== null) travel += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
      if (travel < 34) return;
      travel = 0;
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 18;
      const col = SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)];
      const x = e.clientX + Math.cos(a) * d, y = e.clientY + Math.sin(a) * d, r = 0.8 + Math.random() * 1.6;
      ink.seed(x, y, r, col, 0.55);
      growth.note("seed", [x, y, r, col, 0.55]);
      mem.trail.push({ fx: x / w, fy: y / h, r, col });
      if (mem.trail.length > 4000) mem.trail.shift();
      if (!growth.busy) layer.flush(); // otherwise the running growth loop flushes it
    };
    const onLeave = () => { lastX = null; };

    // While the window is being resized: every frame, size the canvas to it
    // (so nothing stretches) and lay the painting as it was when resizing
    // began back down, shifted so the frog keeps its place in the layout.
    // Growth pauses meanwhile. Once the window settles, redraw it all.
    let drag = null; // { snap, w, h, dpr } from when resizing began
    let followRaf = 0;
    const follow = () => {
      followRaf = 0;
      if (!drag) {
        growth.clear();
        const snap = document.createElement("canvas");
        snap.width = canvas.width;
        snap.height = canvas.height;
        snap.getContext("2d").drawImage(canvas, 0, 0);
        drag = { snap, w, h, dpr };
      }
      sizeTo();
      paper();
      if (dpr === drag.dpr) {
        const [x0, y0] = frogAt(drag.w, drag.h), [x1, y1] = frogAt(w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(drag.snap, Math.round((x1 - x0) * dpr), Math.round((y1 - y0) * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      applyKeepouts();
    };
    // The last frame of the resize, laid over the field and faded out while
    // the redrawn painting appears under it, so it settles instead of jumping.
    const ghost = () => {
      if (reducedMotion) return;
      const g = document.createElement("canvas");
      g.width = canvas.width;
      g.height = canvas.height;
      g.getContext("2d").drawImage(canvas, 0, 0);
      g.className = "field-ghost";
      g.setAttribute("aria-hidden", "true");
      g.style.opacity = getComputedStyle(canvas).opacity;
      canvas.after(g);
      requestAnimationFrame(() => requestAnimationFrame(() => { g.style.opacity = "0"; }));
      setTimeout(() => g.remove(), 600);
    };
    let settle = 0;
    const onResize = () => {
      const sameWidth = window.innerWidth === w && Math.min(2, window.devicePixelRatio || 1) === dpr;
      if (!drag && sameWidth && Math.abs(window.innerHeight - h) < 100) {
        clearTimeout(settle);
        settle = setTimeout(() => { carry(); keepoutKey = ""; applyKeepouts(); }, 150);
        return;
      }
      if (!followRaf) followRaf = requestAnimationFrame(follow);
      clearTimeout(settle);
      settle = setTimeout(() => {
        cancelAnimationFrame(followRaf);
        followRaf = 0;
        drag = null;
        ghost();
        redraw();
      }, 150);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      growth.clear();
      cancelAnimationFrame(warmRaf);
      clearTimeout(settle);
      cancelAnimationFrame(followRaf);
      watcher.disconnect();
      alive = false;
      seedTimers.forEach(clearTimeout);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, isSmall]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`field${dimmed ? " field--dimmed" : ""}`}
        aria-hidden="true"
      />
      <canvas ref={veilRef} className="veil" aria-hidden="true" />
    </>
  );
});
