import React from "react";
import { Ink, C } from "../art/ink.js";
import { lichen, SPORE_COLORS } from "../art/forms.js";

const SIZE = 132; // canvas, CSS px: the rosette plus room for its confetti
const R = 29;     // rosette radius
const SRC = "/assets/brand/anura.svg";

/**
 * Bloom — the frog seal beside the name, made of the field itself: one of
 * the lichen rosettes that grow when you click, run through the same `lichen`
 * form and halftone ink, filled in, with the frog carved out as bare paper.
 * Drawn once; it doesn't move.
 */
export function Bloom() {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(SIZE * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    // A finer screen than the field's, so the rosette keeps its detail small.
    const ink = new Ink(ctx, 1.5);
    const c = SIZE / 2;

    // The rosette exactly as it grows in the field, at a fixed size.
    const it = lichen(ink, c, c, 0.5, [C.rust, C.sun], { R, lobes: 7, spores: 7, ringAlpha: 0.7 });
    while (!it.next().done);

    // Field lichens are open rings; fill this one so the frog has ground to
    // be carved from. A tight screen here, nearly solid, so the frog's thin
    // legs still read once they're cut out.
    const fill = new Ink(ctx, 1);
    for (let i = 0; i < 170; i++) {
      const th = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * R * 0.9;
      fill.wash(c + Math.cos(th) * d, c + Math.sin(th) * d, 5, i % 3 ? C.rust : C.cedar, 0.5, 1);
    }

    let alive = true;
    const img = new Image();
    img.src = SRC;
    img.decode().then(() => {
      if (!alive) return;
      const s = (R * 1.62) / Math.max(img.width, img.height);
      const fw = img.width * s, fh = img.height * s;
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      // Optical centering: put the frog's visual center of mass (the
      // alpha-weighted centroid of its pixels) on the flower's center,
      // rather than the middle of its bounding box, which the lopsided
      // drawing would leave looking off-center.
      const probe = document.createElement("canvas");
      probe.width = Math.ceil(fw);
      probe.height = Math.ceil(fh);
      const pc = probe.getContext("2d", { willReadFrequently: true });
      pc.drawImage(img, 0, 0, fw, fh);
      const px = pc.getImageData(0, 0, probe.width, probe.height).data;
      let mass = 0, mx = 0, my = 0;
      for (let y = 0; y < probe.height; y++) {
        for (let x = 0; x < probe.width; x++) {
          const a = px[(y * probe.width + x) * 4 + 3];
          mass += a; mx += a * x; my += a * y;
        }
      }
      const gx = mass ? mx / mass : fw / 2;
      const gy = mass ? my / mass : fh / 2;

      // The frog exactly as drawn: one clean cut, no reshaping.
      ctx.drawImage(img, c - gx, c - gy, fw, fh);

      // Confetti thrown around it, the way spores scatter in the field:
      // mixed sizes and colors. Kept to the top and right, in a flattened
      // spread, so none land on the name or the bio line.
      ctx.globalCompositeOperation = "multiply";
      const n = 18 + Math.floor(Math.random() * 7);
      for (let i = 0; i < n; i++) {
        const ang = (-170 + Math.random() * 195) * (Math.PI / 180);
        const d = R * (1.05 + Math.random() * 0.95);
        const big = Math.random() < 0.14;
        ink.seed(
          c + Math.cos(ang) * d * 1.15,
          c + Math.sin(ang) * d * 0.62,
          big ? 2.4 + Math.random() * 1.8 : 0.7 + Math.random() * 1.5,
          SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)],
          0.45 + Math.random() * 0.5
        );
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <canvas
      ref={ref}
      className="bloom"
      role="img"
      aria-label="frog seal"
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
