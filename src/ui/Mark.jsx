import React from "react";
import { Ink, C } from "../art/ink.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const PAD = 10; // room around the frog for a few spores
const SRC = "/assets/brand/anura.svg";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Head and body darker, legs lighter, the odd warm accent: a Pacific tree frog.
function colorAt(u) {
  if (Math.random() < 0.08) return pick([C.sun, C.rust]);
  if (u < 0.38) return pick([C.fir, C.fern, C.fern]);
  if (u < 0.66) return pick([C.fern, C.moss, C.fern]);
  return pick([C.spring, C.moss, C.lichen]);
}

/**
 * Mark — the anura frog, grown in the same halftone ink as the plants rather
 * than printed. Washes land inside the frog's silhouette from the middle
 * outward, then a few spores settle around it, and it holds still. Clicking it
 * grows it again. Reduced motion: drawn complete, instantly.
 *
 * The washes are painted freely on one layer and clipped to the SVG's real
 * shape when composed, so edges stay true to the drawing.
 */
export function Mark() {
  const canvasRef = React.useRef(null);
  const regrow = React.useRef(() => {});
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");
  const frog = isSmall ? 58 : 72;
  const W = frog + PAD * 2;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(W * dpr);
    canvas.width = canvas.height = px;
    const out = canvas.getContext("2d");

    const layer = () => {
      const c = document.createElement("canvas");
      c.width = c.height = px;
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c, ctx };
    };
    const paint = layer();
    const spores = layer();
    const mask = layer();
    paint.ctx.globalCompositeOperation = "multiply";
    const paintInk = new Ink(paint.ctx, 2);
    const sporeInk = new Ink(spores.ctx);

    let raf = 0, timer = 0, alive = true;
    let points = [];

    const compose = () => {
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.clearRect(0, 0, px, px);
      out.globalCompositeOperation = "source-over";
      out.drawImage(paint.c, 0, 0);
      out.globalCompositeOperation = "destination-in";
      out.drawImage(mask.c, 0, 0);
      out.globalCompositeOperation = "source-over";
      out.drawImage(spores.c, 0, 0);
    };

    const stamp = (p, i) => {
      if (i % 3 === 0) paintInk.wash(p.x, p.y, 9, pick([C.spring, C.lichen]), 0.16, 0.5);
      paintInk.wash(p.x, p.y, 4, colorAt(p.u), 0.6, 1);
    };

    const scatter = () => {
      const n = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        sporeInk.seed(
          PAD * 0.4 + Math.random() * (W - PAD * 0.8),
          PAD * 0.4 + Math.random() * (W - PAD * 0.8),
          0.6 + Math.random() * 1.1,
          pick([C.sun, C.rust, C.lichen, C.fern, C.berry]),
          0.8
        );
      }
    };

    const grow = () => {
      cancelAnimationFrame(raf);
      for (const l of [paint, spores]) {
        l.ctx.save();
        l.ctx.setTransform(1, 0, 0, 1, 0, 0);
        l.ctx.clearRect(0, 0, px, px);
        l.ctx.restore();
      }
      // Fill from the middle of the body outward, a little unevenly.
      const cx = PAD + frog * 0.5, cy = PAD + frog * 0.5;
      const order = points
        .map((p) => ({ ...p, k: Math.hypot(p.x - cx, p.y - cy) + Math.random() * 10 }))
        .sort((a, b) => a.k - b.k);

      if (reducedMotion) {
        order.forEach(stamp);
        scatter();
        compose();
        return;
      }

      let i = 0;
      const perFrame = Math.max(2, Math.ceil(order.length / 110)); // ~1.8s
      const frame = () => {
        for (let k = 0; k < perFrame && i < order.length; k++, i++) stamp(order[i], i);
        if (i >= order.length) scatter();
        compose();
        raf = i < order.length && alive ? requestAnimationFrame(frame) : 0;
      };
      raf = requestAnimationFrame(frame);
    };

    const img = new Image();
    img.src = SRC;
    img.decode().then(() => {
      if (!alive) return;
      // Fit the drawing in the frog box, keeping its proportions.
      const s = frog / Math.max(img.width, img.height);
      const fw = img.width * s, fh = img.height * s;
      const ox = PAD + (frog - fw) / 2, oy = PAD + (frog - fh) / 2;
      mask.ctx.drawImage(img, ox, oy, fw, fh);

      // Where to stamp: every 2px that falls inside the silhouette.
      const probe = document.createElement("canvas");
      probe.width = probe.height = W;
      const pc = probe.getContext("2d");
      pc.drawImage(img, ox, oy, fw, fh);
      const data = pc.getImageData(0, 0, W, W).data;
      points = [];
      for (let y = 0; y < W; y += 2) {
        for (let x = 0; x < W; x += 2) {
          if (data[(y * W + x) * 4 + 3] > 128) {
            points.push({ x, y, u: (x - PAD + (y - PAD)) / (2 * frog) });
          }
        }
      }
      regrow.current = grow;
      timer = setTimeout(grow, reducedMotion ? 0 : 300);
    }).catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [W, frog, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="mark"
      role="img"
      aria-label="Daniel Kaliko's frog mark"
      title="grow it again"
      // Negative margins cancel the spore padding so the frog itself sits
      // flush with the top of the name and the right edge of the folds.
      style={{ width: W, height: W, margin: `-${PAD}px -${PAD + 3}px 0 0` }}
      onClick={() => regrow.current()}
    />
  );
}
