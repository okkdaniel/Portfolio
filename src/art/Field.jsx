import React from "react";
import { Ink, C, PAPER, FEATHER, WOBBLE } from "./ink.js";
import { grow, clearing, SPORE_COLORS } from "./forms.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const FROG_SRC = "/assets/brand/anura.svg";

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
 * Hidden on the paper is the anura frog in masking fluid: ink never lands on
 * it, and the page opens by growing a clearing over it, so the frog appears
 * as the bare paper the paint couldn't reach.
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
    // Ink is drawn with plain blending onto a transparent scratch layer, which
    // is then multiplied onto the paper in a single draw per frame, over just
    // the area that changed. Multiplying every wash directly made the GPU copy
    // the canvas behind each draw call: ~3.5x the cost (measured).
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d");
    const ink = new Ink(sctx, isSmall ? 2.2 : 3);
    let w = 0, h = 0, dpr = 1;
    let growing = [];
    let raf = 0;

    const paper = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
    };

    // Multiply whatever ink has gathered on the scratch layer onto the paper,
    // then wipe that patch of scratch.
    const flush = () => {
      const d = ink.dirty;
      if (!d) return;
      ink.dirty = null;
      const x0 = Math.max(0, Math.floor(d[0] * dpr) - 2);
      const y0 = Math.max(0, Math.floor(d[1] * dpr) - 2);
      const x1 = Math.min(canvas.width, Math.ceil(d[2] * dpr) + 2);
      const y1 = Math.min(canvas.height, Math.ceil(d[3] * dpr) + 2);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 1;
      ctx.drawImage(scratch, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
      sctx.save();
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(x0, y0, x1 - x0, y1 - y0);
      sctx.restore();
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
      ink.pixelRatio = dpr;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = veil.width = scratch.width = Math.round(w * dpr);
      canvas.height = veil.height = scratch.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ink.dirty = null;
      paper();
      if (keep) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(keep, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      const key = ink.keepouts.map((r) => [r.x, r.y, r.w, r.h].map(Math.round).join(",")).join("|") + "@" + dpr;
      if (key === keepoutKey) return;
      keepoutKey = key;
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

    // Recording is resumable and runs a slice at a time inside the frame loop,
    // so a click never stalls a frame however much it sets off. `pending`
    // holds one entry per top-level form; each keeps a stack of generator
    // contexts, since a form can spawn another (a runner opening a fern)
    // whose tree hangs off the stroke it was spawned from. A form starts
    // playing as soon as its own tree is fully recorded.
    let pending = [];
    const contextFor = ({ it }, attach = null) => {
      const root = { marks: [], kids: [] };
      return { it, root, stack: [root], attach };
    };

    const advance = (deadline, emit) => {
      while (pending.length) {
        const top = pending[0];
        const ctx = top[top.length - 1];
        recorder.stack = ctx.stack;
        let finished = false;
        for (let k = 0; k < 32; k++) {
          const r = ctx.it.next();
          if (r.done) { finished = true; break; }
          if (r.value && r.value.spawn) {
            const s = ctx.stack[ctx.stack.length - 1];
            top.push(contextFor(r.value.spawn, { s, at: s.marks.length }));
            break;
          }
        }
        if (finished) {
          top.pop();
          if (ctx.attach) ctx.attach.s.kids.push({ at: ctx.attach.at, s: ctx.root });
          else { pending.shift(); emit(ctx.root); }
        }
        if (performance.now() > deadline) return;
      }
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
    // Drawing is capped at a few milliseconds per frame: whatever's due past
    // that waits for the next frame. Under heavy clicking, growth falls a beat
    // behind its schedule instead of the page stuttering. Plantings take
    // turns starting first, so none is starved while others are busy.
    // Two caps: script time, and dots handed to the canvas (the canvas fills
    // them after the script returns, so time alone undercounts the cost).
    const RECORD_MS = 4;
    const BUDGET_MS = 6;
    const BUDGET_DOTS = 4500;
    let turn = 0;
    const play = (root) => {
      const marks = schedule(root, 0, []).sort((p, q) => p[0] - q[0]);
      growing.push({ marks, t0: null, i: 0 });
    };
    const frame = (ms) => {
      const now = ms / 1000;
      advance(performance.now() + RECORD_MS, play);
      const start = performance.now();
      const dots0 = ink.dots;
      const spent = () => performance.now() - start > BUDGET_MS || ink.dots - dots0 > BUDGET_DOTS;
      const n = growing.length;
      for (let k = 0; k < n; k++) {
        const g = growing[(k + turn) % n];
        if (g.t0 === null) g.t0 = now;
        const t = now - g.t0;
        while (g.i < g.marks.length && g.marks[g.i][0] <= t) {
          const [kind, a] = g.marks[g.i][1];
          if (kind === "wash") {
            // A big wash may not fit in what's left of the frame; draw what
            // fits and pick it up from the same row next frame.
            const left = Math.max(1, BUDGET_DOTS - (ink.dots - dots0));
            const row = ink.wash(a[0], a[1], a[2], a[3], a[4] ?? 0.4, a[5] ?? 1, g.row ?? null, left);
            if (row !== -1) { g.row = row; break; }
            g.row = null;
          } else {
            ink.seed(...a);
          }
          g.i++;
          if (spent()) break;
        }
        if (spent()) break;
      }
      flush();
      turn++;
      growing = growing.filter((g) => g.i < g.marks.length);
      raf = growing.length || pending.length ? requestAnimationFrame(frame) : 0;
    };

    const scale = () => Math.min(1.4, Math.max(0.85, Math.min(w, h) / 700));

    // Queue a set of generators to be recorded, timed and played. Reduced
    // motion records and draws them all at once.
    const plant = (gens) => {
      for (const g of gens) pending.push([contextFor(g)]);
      if (reducedMotion) {
        advance(Infinity, (root) => schedule(root, 0, []).forEach((m) => draw(m[1])));
        flush();
        return;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const growAt = (x, y, s = scale() * (0.75 + Math.random() * 0.5)) => {
      plant(grow(recorder, x, y, s, { w, h }));
    };

    // ---- the frog ----
    // Masking fluid in the shape of the anura frog, laid on the paper before
    // anything grows (see Ink.resist). The page opens by planting a clearing
    // over it, so the frog surfaces as bare paper in the middle of the
    // growth. It's placed once; resizing or clearing the paper leaves it be.
    let alive = true;
    const placeFrog = async () => {
      const img = new Image();
      img.src = FROG_SRC;
      await img.decode();
      if (!alive) return null;
      const size = isSmall ? w * 0.62 : Math.min(w * 0.26, h * 0.48);
      const k = size / Math.max(img.width, img.height);
      const fw = Math.round(img.width * k), fh = Math.round(img.height * k);
      const cx = isSmall ? w * 0.5 : w * 0.66;
      const cy = isSmall ? h * 0.66 : h * 0.56;
      const probe = document.createElement("canvas");
      probe.width = fw;
      probe.height = fh;
      const pc = probe.getContext("2d", { willReadFrequently: true });
      pc.drawImage(img, 0, 0, fw, fh);
      const px = pc.getImageData(0, 0, fw, fh).data;
      const a = new Uint8Array(fw * fh);
      for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3];
      ink.resist = { x: Math.round(cx - fw / 2), y: Math.round(cy - fh / 2), w: fw, h: fh, a };
      return { x: cx - fw * 0.65, y: cy - fh * 0.65, w: fw * 1.3, h: fh * 1.3 };
    };

    api.current.reset = () => {
      growing = [];
      pending = [];
      ink.dirty = null;
      sctx.save();
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      sctx.restore();
      paper();
    };

    resize();

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
    flush();
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
    // on wider screens one more patch off in the corner.
    const seedTimers = [];
    placeFrog()
      .then((box) => {
        if (!box) return;
        seedTimers.push(setTimeout(() => plant(clearing(recorder, box, scale(), { w, h })), reducedMotion ? 0 : 300));
      })
      .catch(() => {});
    if (!isSmall) {
      seedTimers.push(setTimeout(() => growAt(w * 0.9, h * 0.18), reducedMotion ? 0 : 2200));
    }

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
      if (!raf) flush(); // otherwise the running frame loop flushes it
    };
    const onLeave = () => { lastX = null; };
    const onResize = () => { resize(); keepoutKey = ""; applyKeepouts(); }; // resize wipes the veil

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(warmRaf);
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
