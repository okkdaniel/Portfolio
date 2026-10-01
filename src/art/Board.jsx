import React from "react";
import { Growth, G, DX, DY, MAX_AGE } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

/**
 * Board — the full-screen canvas the whole site lives on. Steps the growth
 * engine every frame and draws it: traces colored by age (fresh copper,
 * oxidizing through verdigris into moss, then fading), pads, glowing growth
 * tips, and a handful of fireflies.
 *
 * Input: moving the pointer grows roots from it; a click (or a tap that
 * doesn't drag) solders a glowing pad that bursts into traces.
 *
 * Exposes { reset, ping, randomPad } through its ref for the overlay's reset
 * control and for the frog.
 *
 * Reduced motion: the board is pre-grown once, drawn still, and only redrawn
 * when someone solders.
 */

// Patina: [age in seconds, rgb]. Copper oxidizes to verdigris, then moss takes it.
const PATINA = [
  [0,   [255, 196, 140]],
  [1.5, [226, 146, 92]],
  [8,   [194, 122, 69]],
  [18,  [140, 130, 92]],
  [30,  [95, 150, 128]],
  [55,  [72, 112, 82]],
  [100, [52, 80, 56]],
  [MAX_AGE, [30, 44, 34]],
];
const BUCKET_EDGES = [0, 1, 2.5, 5, 8, 12, 17, 23, 32, 45, 65, 90, 120, 145, MAX_AGE];

function patinaAt(age) {
  for (let i = 1; i < PATINA.length; i++) {
    const [a1, c1] = PATINA[i];
    const [a0, c0] = PATINA[i - 1];
    if (age <= a1) {
      const f = (age - a0) / (a1 - a0);
      return c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
    }
  }
  return PATINA[PATINA.length - 1][1];
}

// One color per bucket, evaluated at the bucket's midpoint; the last few fade out.
const BUCKET_STYLE = BUCKET_EDGES.slice(0, -1).map((a0, i) => {
  const mid = (a0 + BUCKET_EDGES[i + 1]) / 2;
  const [r, g, b] = patinaAt(mid);
  const alpha = mid > 140 ? 0.35 : mid > 120 ? 0.65 : 1;
  return `rgba(${r},${g},${b},${alpha})`;
});

function bucketOf(age) {
  let i = 0;
  while (i < BUCKET_EDGES.length - 2 && age >= BUCKET_EDGES[i + 1]) i++;
  return i;
}

function glowSprite(rgb, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.18, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function makeFireflies(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: h * (0.15 + Math.random() * 0.8),
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 6,
    ph: Math.random() * Math.PI * 2,
    f: 0.6 + Math.random() * 0.9,
  }));
}

export const Board = React.forwardRef(function Board({ dimmed = false }, ref) {
  const canvasRef = React.useRef(null);
  const engineRef = React.useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");
  const drawRef = React.useRef(() => {});

  if (!engineRef.current) {
    engineRef.current = isSmall
      ? new Growth({ segCap: 5000, padCap: 300, tipCap: 220 })
      : new Growth();
  }

  React.useImperativeHandle(ref, () => ({
    reset() {
      engineRef.current.reset();
      if (reducedMotion) { pregrow(engineRef.current, 40); drawRef.current(); }
    },
    ping(x, y) { engineRef.current.ping(x, y); },
    randomPad(x, y, reach, avoid) { return engineRef.current.randomPad(x, y, reach, avoid); },
  }), [reducedMotion]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const engine = engineRef.current;
    const copperGlow = glowSprite("235,150,90");
    const flyGlow = glowSprite("214,240,140");
    let w = 0, h = 0, dpr = 1;
    let flies = [];
    let gridPattern = null;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      engine.resize(w, h);
      if (!flies.length) flies = makeFireflies(isSmall ? 8 : 16, w, h);
      // Faint lattice of dots: the bare board under everything.
      const tile = document.createElement("canvas");
      tile.width = tile.height = G * 3;
      const tg = tile.getContext("2d");
      tg.fillStyle = "rgba(190,210,195,0.07)";
      tg.fillRect(0, 0, 1, 1);
      gridPattern = ctx.createPattern(tile, "repeat");
    };

    const draw = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#070a08";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = gridPattern;
      ctx.fillRect(0, 0, w, h);

      // Traces, batched into one stroke per (age bucket, width).
      const batches = new Map();
      engine.forEachSegment((i) => {
        const key = bucketOf(engine.now - engine.sb[i]) * 16 + Math.round(engine.sw[i] * 2);
        let list = batches.get(key);
        if (!list) batches.set(key, (list = []));
        list.push(i);
      });
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [key, list] of batches) {
        ctx.strokeStyle = BUCKET_STYLE[Math.floor(key / 16)];
        ctx.lineWidth = (key % 16) / 2;
        ctx.beginPath();
        for (const i of list) {
          const x = engine.sx[i] * G, y = engine.sy[i] * G, d = engine.sd[i];
          ctx.moveTo(x, y);
          ctx.lineTo(x + DX[d] * G, y + DY[d] * G);
        }
        ctx.stroke();
      }

      // Pads: a ring with a drilled center.
      const padStart = Math.max(0, engine.pn - engine.padCap);
      for (let s = padStart; s < engine.pn; s++) {
        const i = s % engine.padCap;
        const age = engine.now - engine.pb[i];
        if (age > MAX_AGE) continue;
        const x = engine.px[i] * G, y = engine.py[i] * G, r = engine.pr[i];
        ctx.strokeStyle = BUCKET_STYLE[bucketOf(engine.pg[i] ? Math.max(0, age - 6) : age)];
        ctx.lineWidth = 1.6;
        ctx.fillStyle = "#070a08";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "lighter";

      // Freshly soldered pads flare, then cool.
      for (let s = padStart; s < engine.pn; s++) {
        const i = s % engine.padCap;
        if (!engine.pg[i]) continue;
        const age = engine.now - engine.pb[i];
        if (age > 5) continue;
        const k = 1 - age / 5;
        const size = 30 + 70 * k;
        ctx.globalAlpha = 0.85 * k * k;
        ctx.drawImage(copperGlow, engine.px[i] * G - size / 2, engine.py[i] * G - size / 2, size, size);
      }

      // Growing tips glow.
      ctx.globalAlpha = 0.55;
      for (const tip of engine.tips) {
        const size = tip.w > 2 ? 22 : 14;
        ctx.drawImage(copperGlow, tip.cx * G - size / 2, tip.cy * G - size / 2, size, size);
      }

      // Fireflies.
      if (t !== undefined) {
        for (const f of flies) {
          const a = Math.pow(Math.max(0, Math.sin(t * f.f + f.ph)), 3);
          if (a < 0.02) continue;
          ctx.globalAlpha = a * 0.9;
          ctx.drawImage(flyGlow, f.x - 12, f.y - 12, 24, 24);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const moveFlies = (dt, t) => {
      for (const f of flies) {
        f.vx += (Math.sin(t * 0.3 + f.ph) * 6 - f.vx) * dt * 0.5;
        f.vy += (Math.cos(t * 0.23 + f.ph * 1.7) * 4 - f.vy) * dt * 0.5;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;
        if (f.y < h * 0.1) f.vy += 2; else if (f.y > h) f.vy -= 2;
      }
    };

    // Keep traces out from under the text: anything marked data-keepout.
    const applyKeepouts = () => {
      const rects = [...document.querySelectorAll("[data-keepout]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - 14, y: r.top - 14, w: r.width + 28, h: r.height + 28 };
      });
      engine.setKeepouts(rects);
    };

    resize();
    applyKeepouts();
    // Folds open and close, so the text's footprint changes; re-measure often.
    const keepoutTimer = setInterval(applyKeepouts, 400);
    drawRef.current = () => draw();

    // ---- input ----
    let lastX = null, lastY = null, travel = 0;
    let downX = 0, downY = 0, downAt = 0;
    const onMove = (e) => {
      if (lastX !== null) travel += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
      if (travel > 26 && !reducedMotion) {
        travel = 0;
        engine.growAt(e.clientX, e.clientY);
      }
    };
    const onLeave = () => { lastX = null; };
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; downAt = performance.now(); };
    const onUp = (e) => {
      const still = Math.hypot(e.clientX - downX, e.clientY - downY) < 8;
      if (!still || performance.now() - downAt > 600) return;
      engine.solderAt(e.clientX, e.clientY);
      if (reducedMotion) { pregrow(engine, 2.5); draw(); }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    // ---- loop ----
    let raf = 0;
    let last = 0;
    let clock = 0;
    const frame = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      engine.update(dt);
      moveFlies(dt, clock);
      draw(clock);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => { resize(); applyKeepouts(); if (reducedMotion) draw(); };

    if (reducedMotion) {
      if (engine.n === 0) pregrow(engine, 45);
      draw();
    } else {
      start();
      document.addEventListener("visibilitychange", onVisibility);
    }
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      clearInterval(keepoutTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [reducedMotion, isSmall]);

  return (
    <canvas
      ref={canvasRef}
      className={`board${dimmed ? " board--dimmed" : ""}`}
      aria-hidden="true"
    />
  );
});

/** Runs the simulation forward without drawing (reduced-motion snapshots). */
function pregrow(engine, seconds) {
  for (let i = 0; i < seconds * 30; i++) engine.update(1 / 30);
}
