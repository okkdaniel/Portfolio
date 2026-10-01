import React from "react";
import { Ink, PAPER, FEATHER, WOBBLE } from "./ink.js";
import { grow, SPORE_COLORS } from "./forms.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

/**
 * Field — the paper everything grows on. A click sets off a growth: a bloom of
 * some plant at the spot, runners creeping outward that open more plants as
 * they go, and a scatter of spores. Moving the mouse leaves a faint trail of
 * spores.
 *
 * The canvas is never cleared. Each mark is drawn exactly once, when the
 * growth reaches it, so the field only accumulates and a frame costs the
 * same however full it gets. The loop sleeps when nothing is growing.
 *
 * Anything marked data-keepout (the text) is kept clear of new ink. Ink that
 * grew before the text got there (a fold opening over it) is hidden by the
 * veil: a second canvas of paper laid over the field, solid under the text
 * and dithered away across the same soft, wandering edge that new ink thins
 * out along. The veil follows the text as folds open and close, and never
 * erases anything, so closing a fold brings the plants back.
 *
 * Reduced motion: each growth is drawn complete, instantly.
 *
 * Ref: { reset } clears the paper.
 */
export const Field = React.forwardRef(function Field({ dimmed = false }, ref) {
  const canvasRef = React.useRef(null);
  const veilRef = React.useRef(null);
  const api = React.useRef({ reset() {} });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");

  React.useImperativeHandle(ref, () => ({ reset: () => api.current.reset() }), []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const veil = veilRef.current;
    const vctx = veil.getContext("2d");
    const ink = new Ink(ctx, isSmall ? 2.2 : 3);
    let w = 0, h = 0, dpr = 1;
    let growing = [];
    let raf = 0;

    const paper = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "multiply";
    };

    // Resizing a canvas wipes it, so carry the painting across.
    const resize = () => {
      const keep = w ? document.createElement("canvas") : null;
      if (keep) {
        keep.width = canvas.width;
        keep.height = canvas.height;
        keep.getContext("2d").drawImage(canvas, 0, 0);
      }
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = veil.width = Math.round(w * dpr);
      canvas.height = veil.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paper();
      if (keep) {
        ctx.globalCompositeOperation = "source-over";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(keep, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "multiply";
      }
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
      for (const r of ink.keepouts) {
        vctx.fillRect(r.x, r.y, r.w, r.h);
        const gx0 = Math.floor((r.x - M) / P), gx1 = Math.ceil((r.x + r.w + M) / P);
        const gy0 = Math.floor((r.y - M) / P), gy1 = Math.ceil((r.y + r.h + M) / P);
        for (let gy = gy0; gy <= gy1; gy++) {
          const py = gy * P;
          for (let gx = gx0; gx <= gx1; gx++) {
            const px = gx * P;
            if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) continue;
            if (cellHash(gx, gy) < ink.fade(px, py)) continue;
            vctx.fillRect(px - P / 2 - 0.3, py - P / 2 - 0.3, P + 0.6, P + 0.6);
          }
        }
      }
    };

    const applyKeepouts = () => {
      ink.keepouts = [...document.querySelectorAll("[data-keepout]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 };
      });
      drawVeil();
    };

    // ---- easing ----
    // When something is planted, its generators run to the end at once
    // against a recorder rather than the real ink, which captures every mark
    // as a tree of strokes (ink.open/close in forms.js; a spawned plant is a
    // stroke too). Each stroke is then timed on its own ease-out curve, quick
    // to start and slowing before it finishes, and each child stroke starts
    // the moment its parent reaches the spot it branches from. Playback just
    // draws marks as their times come due. Keep-out fades are still decided
    // at draw time, against the real ink.
    const PER_MARK = 0.022; // seconds of stroke per mark, before easing
    const MIN_STROKE = 0.35;
    const easeOutInv = (p) => 1 - Math.pow(1 - p, 1 / 4); // inverse of ease-out quart

    const recorder = {
      stack: null,
      top() { return this.stack[this.stack.length - 1]; },
      wash(...a) { this.top().marks.push(["wash", a]); },
      seed(...a) { this.top().marks.push(["seed", a]); },
      open() {
        const parent = this.top();
        const s = { marks: [], kids: [] };
        parent.kids.push({ at: parent.marks.length, s });
        this.stack.push(s);
      },
      close() { this.stack.pop(); },
      blocked: (x, y) => ink.blocked(x, y),
    };

    const record = ({ it }) => {
      const root = { marks: [], kids: [] };
      const saved = recorder.stack;
      recorder.stack = [root];
      for (;;) {
        const r = it.next();
        if (r.done) break;
        if (r.value && r.value.spawn) {
          const at = recorder.top();
          const here = recorder.stack;
          const child = record(r.value.spawn);
          recorder.stack = here;
          at.kids.push({ at: at.marks.length, s: child });
        }
      }
      recorder.stack = saved;
      return root;
    };

    // Flatten a stroke tree into [time, mark] pairs.
    const schedule = (s, start, out) => {
      const n = s.marks.length;
      const D = Math.max(MIN_STROKE, n * PER_MARK);
      const times = s.marks.map((_, j) => start + D * easeOutInv((j + 1) / n));
      s.marks.forEach((m, j) => out.push([times[j], m]));
      for (const k of s.kids) schedule(k.s, k.at > 0 ? times[k.at - 1] : start, out);
      return out;
    };

    const draw = ([kind, a]) => (kind === "wash" ? ink.wash(...a) : ink.seed(...a));

    // Each planting is its own timeline of marks sorted by when they land.
    const frame = (ms) => {
      const now = ms / 1000;
      growing = growing.filter((g) => {
        if (g.t0 === null) g.t0 = now;
        const t = now - g.t0;
        while (g.i < g.marks.length && g.marks[g.i][0] <= t) draw(g.marks[g.i++][1]);
        return g.i < g.marks.length;
      });
      raf = growing.length ? requestAnimationFrame(frame) : 0;
    };

    const scale = () => Math.min(1.4, Math.max(0.85, Math.min(w, h) / 700));

    const growAt = (x, y, s = scale() * (0.75 + Math.random() * 0.5)) => {
      const marks = [];
      for (const g of grow(recorder, x, y, s, { w, h })) schedule(record(g), 0, marks);
      if (reducedMotion) {
        marks.forEach((m) => draw(m[1]));
        return;
      }
      marks.sort((p, q) => p[0] - q[0]);
      growing.push({ marks, t0: null, i: 0 });
      if (!raf) raf = requestAnimationFrame(frame);
    };

    api.current.reset = () => {
      growing = [];
      paper();
    };

    resize();
    applyKeepouts();
    // Folds change the text's footprint; follow it every frame they animate.
    const watcher = new ResizeObserver(applyKeepouts);
    document.querySelectorAll("[data-keepout]").forEach((el) => watcher.observe(el));

    // A little has already grown when you arrive.
    const seeds = isSmall
      ? [[0.62, 0.8, 0]]
      : [[0.74, 0.66, 0], [0.9, 0.2, 1400]];
    const seedTimers = seeds.map(([fx, fy, delay]) =>
      setTimeout(() => growAt(w * fx, h * fy), reducedMotion ? 0 : delay + 300)
    );

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
      ink.seed(e.clientX + Math.cos(a) * d, e.clientY + Math.sin(a) * d, 0.8 + Math.random() * 1.6, col, 0.55);
    };
    const onLeave = () => { lastX = null; };
    const onResize = () => { resize(); applyKeepouts(); };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      watcher.disconnect();
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
