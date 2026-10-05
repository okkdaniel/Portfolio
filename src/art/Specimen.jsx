import React from "react";
import { PAPER, resistFrom, opaqueBounds } from "./ink.js";
import { specimen, seeded, setRandom } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { ModelPlate } from "../components/media/ModelPlate.jsx";

/**
 * Specimen — a project's render, standing in its own patch of growth on the
 * sheet. The render is laid on the paper as masking fluid (as the frog is on
 * the field), so once it's scrolled fully into view the ground and the project's plant
 * (`project.plant`) grow around it and leave the object bare, with a thin
 * margin of paper all round.
 *
 * The growth is seeded by the project, so it comes up the same every visit.
 * If the sheet changes size, it's redrawn complete at the new size.
 *
 * A project with a 3D model (`project.model`) can be picked up: "3d model
 * (+)" turns the render into the model in the same spot, to drag around,
 * while the growth fades back. "(−)" sets it down again. The model viewer
 * only loads when it's asked for.
 */
export function Specimen({ project: p, onZoom }) {
  const canvasRef = React.useRef(null);
  const imgRef = React.useRef(null);
  const [lifted, setLifted] = React.useState(false);
  const [ratio, setRatio] = React.useState("1 / 1");
  const inView = useFullyInView(imgRef);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");

  React.useEffect(() => {
    if (!inView || !p.plant) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const layer = inkLayer(canvas, isSmall ? 2.2 : 3);
    const { ink } = layer;
    // The sheet is a small piece of paper; ink gives out over a shorter edge.
    ink.feather = 36;
    ink.wobble = 18;
    const growth = createGrowth(layer, { reducedMotion });
    const spread = isSmall ? 6 : 8;
    let laid = "";

    // Lay the specimen out against the sheet as it is now. `now` draws it
    // complete at once instead of growing it.
    const lay = (now) => {
      const c = canvas.getBoundingClientRect();
      const w = c.width, h = c.height;
      const key = `${Math.round(w)}x${Math.round(h)}`;
      if (!w || !h || key === laid) return;
      laid = key;
      growth.clear();
      layer.clearScratch();
      layer.size(w, h, Math.min(2, window.devicePixelRatio || 1));
      layer.paper(PAPER);

      const r = img.getBoundingClientRect();
      ink.resist = resistFrom(img, Math.round(r.left - c.left), Math.round(r.top - c.top), Math.round(r.width), Math.round(r.height), spread);

      // Keep clear of the text above and below (and the 3D control), and
      // fade out before the canvas's own edges.
      const rel = (q) => ({ x: q.left - c.left - 6, y: q.top - c.top - 6, w: q.width + 12, h: q.height + 12 });
      const sheet = canvas.closest(".sheet");
      const near = sheet ? [...sheet.querySelectorAll(".sheet__lede, .plate__lift, .sheet__facts")] : [];
      const F = 1e4;
      ink.keepouts = [
        ...near.map((el) => rel(el.getBoundingClientRect())),
        { x: -F, y: -F, w: 3 * F, h: F },
        { x: -F, y: h, w: 3 * F, h: F },
        { x: -F, y: -F, w: F, h: 3 * F },
        { x: w, y: -F, w: F, h: 3 * F },
      ];

      const box = opaqueBounds(ink.resist, spread);
      if (!box) return;
      const s = Math.min(1.1, Math.max(0.6, box.h / 380));
      const random = seeded(String(p.seed ?? p.slug));
      let gens;
      setRandom(random);
      try {
        gens = specimen(growth.recorder, p.plant, box, s);
      } finally {
        setRandom(null);
      }
      growth.plant(gens, { random, now });
    };

    let alive = true;
    let watcher = null;
    img
      .decode()
      .catch(() => {})
      .then(() => {
        if (!alive) return;
        lay(reducedMotion);
        watcher = new ResizeObserver(() => lay(true));
        watcher.observe(canvas);
      });

    return () => {
      alive = false;
      watcher?.disconnect();
      growth.clear();
    };
  }, [inView, reducedMotion, isSmall, p.plant, p.seed, p.slug]);

  // The model takes the render's exact box.
  const lift = () => {
    const img = imgRef.current;
    if (img?.naturalWidth) setRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
    setLifted(!lifted);
  };
  // Start fetching the viewer as soon as someone reaches for the control.
  const warm = () => { import("@google/model-viewer"); };

  return (
    <>
      <div className={`plate${p.model ? " plate--model" : ""}${lifted ? " plate--lifted" : ""}`}>
        <canvas ref={canvasRef} className="plate__ink" aria-hidden="true" />
        <div className="object">
          <button type="button" className="render" onClick={onZoom} aria-label="Enlarge the render" tabIndex={lifted ? -1 : 0}>
            <img ref={imgRef} src={p.hero} alt={`${p.title}, render`} />
          </button>
          {lifted && (
            <div className="object__model">
              <ModelPlate
                src={p.model}
                poster={p.hero}
                alt={`${p.title}, interactive 3D model`}
                orientation={p.modelOrientation}
                zoom={p.modelZoom}
                lift={p.modelLift}
                ratio={ratio}
                caption={null}
              />
            </div>
          )}
        </div>
      </div>
      {p.model && (
        <button type="button" className="plate__lift" aria-pressed={lifted} onClick={lift} onPointerEnter={warm} onFocus={warm}>
          3d model <span aria-hidden="true">{lifted ? "(−)" : "(+)"}</span>
          <span className="plate__hint">drag to rotate</span>
        </button>
      )}
    </>
  );
}

/**
 * Whether the image has (once) been scrolled fully into view: loaded, and
 * entirely on screen below the sheet's sticky bar. An image taller than the
 * screen counts once it fills what's visible. Latches true.
 */
function useFullyInView(imgRef) {
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    let io = null;
    let alive = true;
    // Wait for the image itself: before it loads it has no height, and an
    // empty box counts as fully in view anywhere on screen.
    img
      .decode()
      .catch(() => {})
      .then(() => {
        if (!alive) return;
        const bar = img.closest(".sheet")?.querySelector(".sheet__bar")?.offsetHeight ?? 0;
        io = new IntersectionObserver(
          ([e]) => {
            const full = e.intersectionRatio > 0.99 || (e.rootBounds && e.intersectionRect.height >= e.rootBounds.height - 2);
            if (full) {
              setSeen(true);
              io.disconnect();
            }
          },
          { rootMargin: `-${bar}px 0px 0px 0px`, threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
        );
        io.observe(img);
      });
    return () => {
      alive = false;
      io?.disconnect();
    };
  }, [imgRef, seen]);

  return seen;
}
