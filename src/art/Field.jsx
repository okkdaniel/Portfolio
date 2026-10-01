import React from "react";
import { Ink, PAPER } from "./ink.js";
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
 * Anything marked data-keepout (the text) is kept clear of new ink.
 * Reduced motion: each growth is drawn complete, instantly.
 *
 * Ref: { reset } clears the paper.
 */
export const Field = React.forwardRef(function Field({ dimmed = false }, ref) {
  const canvasRef = React.useRef(null);
  const api = React.useRef({ reset() {} });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");

  React.useImperativeHandle(ref, () => ({ reset: () => api.current.reset() }), []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
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
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
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

    const applyKeepouts = () => {
      ink.keepouts = [...document.querySelectorAll("[data-keepout]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 };
      });
    };

    // Run every growing thing a few steps; adopt anything it spawns.
    const step = () => {
      const next = [];
      const spawned = [];
      for (const g of growing) {
        let alive = true;
        for (let k = 0; k < g.speed && alive; k++) {
          const r = g.it.next();
          if (r.done) alive = false;
          else if (r.value && r.value.spawn) spawned.push(r.value.spawn);
        }
        if (alive) next.push(g);
      }
      growing = next.concat(spawned);
    };

    const frame = () => {
      step();
      raf = growing.length ? requestAnimationFrame(frame) : 0;
    };

    const scale = () => Math.min(1.4, Math.max(0.85, Math.min(w, h) / 700));

    const growAt = (x, y, s = scale() * (0.75 + Math.random() * 0.5)) => {
      growing.push(...grow(ink, x, y, s, { w, h }));
      if (reducedMotion) {
        while (growing.length) step();
      } else if (!raf) {
        raf = requestAnimationFrame(frame);
      }
    };

    api.current.reset = () => {
      growing = [];
      paper();
    };

    resize();
    applyKeepouts();
    const keepoutTimer = setInterval(applyKeepouts, 400);

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
      clearInterval(keepoutTimer);
      seedTimers.forEach(clearTimeout);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, isSmall]);

  return (
    <canvas
      ref={canvasRef}
      className={`field${dimmed ? " field--dimmed" : ""}`}
      aria-hidden="true"
    />
  );
});
