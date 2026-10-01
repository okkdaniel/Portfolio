import React from "react";
import { Ink, C } from "../art/ink.js";
import { lichen } from "../art/forms.js";

const SIZE = 72; // canvas, CSS px: the rosette plus room for its spores
const R = 26;    // rosette radius
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
    for (let i = 0; i < 120; i++) {
      const th = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * R * 0.74;
      fill.wash(c + Math.cos(th) * d, c + Math.sin(th) * d, 5, i % 3 ? C.rust : C.cedar, 0.5, 1);
    }

    let alive = true;
    const img = new Image();
    img.src = SRC;
    img.decode().then(() => {
      if (!alive) return;
      const s = (R * 1.7) / Math.max(img.width, img.height);
      const fw = img.width * s, fh = img.height * s;
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.drawImage(img, c - fw / 2, c - fh / 2, fw, fh);
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
