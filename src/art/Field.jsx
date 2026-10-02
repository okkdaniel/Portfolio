import React from "react";
import { C, PAPER, FEATHER, WOBBLE, resistFrom } from "./ink.js";
import { grow, clearing, SPORE_COLORS } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
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
 * same however full it gets. The loop sleeps when nothing is growing (see
 * growth.js for how growth is paced).
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
    const veil = veilRef.current;
    const vctx = veil.getContext("2d");
    const layer = inkLayer(canvas, isSmall ? 2.2 : 3);
    const { ctx, ink } = layer;
    const growth = createGrowth(layer, { reducedMotion });
    const recorder = growth.recorder;
    let w = 0, h = 0, dpr = 1;

    const paper = () => layer.paper(PAPER);

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
      layer.size(w, h, dpr);
      veil.width = canvas.width;
      veil.height = canvas.height;
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

    const scale = () => Math.min(1.4, Math.max(0.85, Math.min(w, h) / 700));

    const plant = (gens) => growth.plant(gens);

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
      ink.resist = resistFrom(img, Math.round(cx - fw / 2), Math.round(cy - fh / 2), fw, fh);
      return { x: cx - fw * 0.65, y: cy - fh * 0.65, w: fw * 1.3, h: fh * 1.3 };
    };

    api.current.reset = () => {
      growth.clear();
      layer.clearScratch();
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
      if (!growth.busy) layer.flush(); // otherwise the running growth loop flushes it
    };
    const onLeave = () => { lastX = null; };
    const onResize = () => { resize(); keepoutKey = ""; applyKeepouts(); }; // resize wipes the veil

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      growth.clear();
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
